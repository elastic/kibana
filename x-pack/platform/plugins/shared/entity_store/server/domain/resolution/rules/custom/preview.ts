/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { escapeEsqlStringLiteral } from '../../../../../common/esql/strings';
import { executeEsqlQuery } from '../../../../infra/elasticsearch/esql';
import type { EsqlExpressionMatchSpec } from '../rule_registry';
import {
  MATCHER_PAGE_SIZE,
  assertCompleteEsqlResults,
  buildMatchGroupsQuery,
  classifyMatchGroup,
  fetchEntities,
  parseMatchGroupRows,
  planMatchGroupLink,
  type MatchGroupRow,
} from '../matcher';
import { RESOLVED_TO_FIELD } from '../matcher/constants';
import { PREVIEW_MAX_PAGES, PREVIEW_SAMPLE_SIZE } from './constants';

export interface CustomRulePreviewSample {
  match_value: string;
  group_size: number;
  target: string;
  aliases: string[];
  /** Targets of group members that are already aliases elsewhere. */
  existing_targets: string[];
  /** Aliases of `aliases` entries that cascade would move onto `target`. */
  cascade_aliases: number;
}

export interface CustomRulePreview {
  scanned_groups: number;
  /** True when the scan stopped before the last page; counts are a lower bound. */
  truncated: boolean;
  would_link_groups: number;
  /** Groups to link where at least one member already belongs to a resolution group. */
  would_join_existing_groups: number;
  /** Groups to link that join two or more existing resolution groups into one. */
  would_merge_existing_groups: number;
  skipped: {
    oversized: number;
    same_namespace_duplicates: number;
    nothing_to_link: number;
  };
  /** The largest groups the rule would link. */
  sample: CustomRulePreviewSample[];
  not_modeled: string[];
}

const NOT_MODELED = [
  'Each group is evaluated on its own. In a real run, a group that shares an entity with a group linked earlier in the same run is skipped until the next run.',
  'Links made by other rules in the same run are not modeled.',
  'Entities that arrive after this preview are not included.',
  'Join and merge counts only see group members that match this rule. A matched entity that is already the target of other aliases is visible only in sample[].cascade_aliases.',
  'The 100-entity group ceiling counts only entities in the group. Cascade can move up to 10,000 existing aliases per group, and a larger alias tree makes the real run skip the group.',
];

const linkableIds = (row: MatchGroupRow): Set<string> =>
  new Set([...row.unresolvedIds, ...row.existingTargetIds]);

const keepLargest = (sample: MatchGroupRow[], row: MatchGroupRow): void => {
  if (sample.length < PREVIEW_SAMPLE_SIZE) {
    sample.push(row);
  } else if (row.groupSize > sample[sample.length - 1].groupSize) {
    sample[sample.length - 1] = row;
  } else {
    return;
  }
  sample.sort((a, b) => b.groupSize - a.groupSize);
};

const countAliasesByTarget = async (
  esClient: ElasticsearchClient,
  index: string,
  targetIds: string[]
): Promise<Map<string, number>> => {
  const counts = new Map<string, number>();
  if (targetIds.length === 0) {
    return counts;
  }
  const ids = targetIds.map((id) => `"${escapeEsqlStringLiteral(id)}"`).join(', ');
  const response = await executeEsqlQuery({
    esClient,
    query: [
      `FROM "${escapeEsqlStringLiteral(index)}"`,
      `| WHERE ${RESOLVED_TO_FIELD} IN (${ids})`,
      `| STATS n = COUNT(*) BY ${RESOLVED_TO_FIELD}`,
      `| LIMIT ${targetIds.length}`,
    ].join('\n'),
  });
  assertCompleteEsqlResults(response, 'preview cascade');
  const nIndex = response.columns.findIndex((column) => column.name === 'n');
  const idIndex = response.columns.findIndex((column) => column.name === RESOLVED_TO_FIELD);
  for (const row of response.values) {
    counts.set(String(row[idIndex]), Number(row[nIndex]));
  }
  return counts;
};

const buildSample = async (
  esClient: ElasticsearchClient,
  index: string,
  rows: MatchGroupRow[]
): Promise<CustomRulePreviewSample[]> => {
  const ids = [...new Set(rows.flatMap((row) => [...linkableIds(row)]))];
  const entities = await fetchEntities(esClient, index, ids);

  const planned = rows.flatMap((row) => {
    const plan = planMatchGroupLink(row, entities);
    return plan && plan.aliasIds.length > 0 ? [{ row, ...plan }] : [];
  });
  const cascade = await countAliasesByTarget(
    esClient,
    index,
    planned.flatMap(({ aliasIds }) => aliasIds)
  );

  return planned.map(({ row, target, aliasIds }) => ({
    match_value: row.matchValue,
    group_size: row.groupSize,
    target: target.entityId,
    aliases: aliasIds,
    existing_targets: row.existingTargetIds,
    cascade_aliases: aliasIds.reduce((sum, id) => sum + (cascade.get(id) ?? 0), 0),
  }));
};

/**
 * Runs a custom rule's full first scan with nothing written, and reports what
 * the engine would do with each group.
 */
export const previewCustomRule = async ({
  esClient,
  index,
  spec,
}: {
  esClient: ElasticsearchClient;
  index: string;
  spec: EsqlExpressionMatchSpec;
}): Promise<CustomRulePreview> => {
  const declineSameNamespaceDuplicates = spec.declineSameNamespaceDuplicates !== false;
  const preview: CustomRulePreview = {
    scanned_groups: 0,
    truncated: false,
    would_link_groups: 0,
    would_join_existing_groups: 0,
    would_merge_existing_groups: 0,
    skipped: { oversized: 0, same_namespace_duplicates: 0, nothing_to_link: 0 },
    sample: [],
    not_modeled: NOT_MODELED,
  };
  const sampleRows: MatchGroupRow[] = [];

  let afterMatchValue: string | undefined;
  for (let page = 0; ; page++) {
    if (page === PREVIEW_MAX_PAGES) {
      preview.truncated = true;
      break;
    }
    const response = await executeEsqlQuery({
      esClient,
      query: buildMatchGroupsQuery({ index, spec, afterMatchValue }),
    });
    assertCompleteEsqlResults(response, 'preview');
    const rows = parseMatchGroupRows(response);

    for (const row of rows) {
      preview.scanned_groups++;
      const verdict = classifyMatchGroup(row, declineSameNamespaceDuplicates);
      if (verdict === 'oversized') {
        preview.skipped.oversized++;
      } else if (verdict === 'ambiguous') {
        preview.skipped.same_namespace_duplicates++;
      } else if (verdict === 'noop' || linkableIds(row).size < 2) {
        preview.skipped.nothing_to_link++;
      } else {
        preview.would_link_groups++;
        const existingTargets = new Set(row.existingTargetIds).size;
        if (existingTargets >= 1) {
          preview.would_join_existing_groups++;
        }
        if (existingTargets >= 2) {
          preview.would_merge_existing_groups++;
        }
        keepLargest(sampleRows, row);
      }
    }

    if (rows.length < MATCHER_PAGE_SIZE) {
      break;
    }
    afterMatchValue = rows[rows.length - 1].matchValue;
  }

  preview.sample = await buildSample(esClient, index, sampleRows);
  return preview;
};
