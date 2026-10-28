/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { escapeEsqlStringLiteral } from '../../../../../common/esql/strings';
import { executeEsqlQuery, isPartialEsqlResponse } from '../../../../infra/elasticsearch/esql';
import { MAX_RESOLUTION_SEARCH_SIZE } from '../../resolution_client';
import type { EsqlExpressionMatchSpec } from '../rule_registry';
import {
  GROUP_SIZE_CEILING,
  MATCHER_PAGE_SIZE,
  RESOLVED_TO_FIELD,
  buildMatchGroupsQuery,
  classifyMatchGroup,
  fetchEntities,
  parseMatchGroupRows,
  planMatchGroupLink,
  type MatchGroupRow,
} from '../matcher';
import { PREVIEW_MAX_PAGES, PREVIEW_SAMPLE_SIZE } from './constants';

export interface CustomRulePreviewSample {
  match_value: string;
  group_size: number;
  target: string;
  aliases: string[];
  /** Targets that group members already resolve to. */
  existing_targets: string[];
  /** Existing aliases of `aliases` that cascade would move onto `target`. */
  cascade_alias_count: number;
}

export interface CustomRulePreview {
  scanned_groups: number;
  /** True when the scan stopped before the last page; counts are a lower bound. */
  truncated: boolean;
  /** True when Elasticsearch returned partial results for a page; counts are a lower bound. */
  partial: boolean;
  would_link_groups: number;
  /** Groups to link where at least one member already belongs to a resolution group. */
  would_extend_existing_groups: number;
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
  'Groups whose members already resolve to one target are not returned at all.',
  'Extend and merge counts only see group members that match this rule. A matched entity that is already the target of other aliases is visible only in sample[].cascade_alias_count.',
  `The ${GROUP_SIZE_CEILING}-entity group ceiling counts only entities in the group. Cascade can move up to ${MAX_RESOLUTION_SEARCH_SIZE} existing aliases per group, and a larger alias tree makes the real run skip the group.`,
];

const linkableIds = (row: MatchGroupRow): Set<string> =>
  new Set([...row.unresolvedIds, ...row.existingTargetIds]);

// The engine's 'candidate' verdict still includes groups with only one linkable
// entity; those turn into no-ops once the entities are read.
const hasSomethingToLink = (row: MatchGroupRow): boolean => linkableIds(row).size >= 2;

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

const countExistingAliasesOf = async (
  esClient: ElasticsearchClient,
  index: string,
  entityIds: string[],
  signal?: AbortSignal
): Promise<{ counts: Map<string, number>; partial: boolean }> => {
  const counts = new Map<string, number>();
  if (entityIds.length === 0) {
    return { counts, partial: false };
  }
  const ids = entityIds.map((id) => `"${escapeEsqlStringLiteral(id)}"`).join(', ');
  const response = await executeEsqlQuery({
    esClient,
    signal,
    query: [
      `FROM "${escapeEsqlStringLiteral(index)}"`,
      `| WHERE ${RESOLVED_TO_FIELD} IN (${ids})`,
      `| STATS alias_count = COUNT(*) BY ${RESOLVED_TO_FIELD}`,
      `| LIMIT ${entityIds.length}`,
    ].join('\n'),
  });
  const countIndex = response.columns.findIndex((column) => column.name === 'alias_count');
  const idIndex = response.columns.findIndex((column) => column.name === RESOLVED_TO_FIELD);
  for (const row of response.values) {
    counts.set(String(row[idIndex]), Number(row[countIndex]));
  }
  return { counts, partial: isPartialEsqlResponse(response) };
};

const buildSample = async (
  esClient: ElasticsearchClient,
  index: string,
  rows: MatchGroupRow[],
  signal?: AbortSignal
): Promise<{ sample: CustomRulePreviewSample[]; partial: boolean }> => {
  const ids = [...new Set(rows.flatMap((row) => [...linkableIds(row)]))];
  const entities = await fetchEntities(esClient, index, ids);

  const planned = rows.flatMap((row) => {
    const plan = planMatchGroupLink(row, entities);
    return plan && plan.aliasIds.length > 0 ? [{ row, ...plan }] : [];
  });
  const { counts: aliasCounts, partial } = await countExistingAliasesOf(
    esClient,
    index,
    planned.flatMap(({ aliasIds }) => aliasIds),
    signal
  );

  const sample = planned.map(({ row, target, aliasIds }) => ({
    match_value: row.matchValue,
    group_size: row.groupSize,
    target: target.entityId,
    aliases: aliasIds,
    existing_targets: [...new Set(row.existingTargetIds)],
    cascade_alias_count: aliasIds.reduce((sum, id) => sum + (aliasCounts.get(id) ?? 0), 0),
  }));
  return { sample, partial };
};

/**
 * Runs a custom rule's first-scan query read-only (up to PREVIEW_MAX_PAGES
 * pages) and classifies each group as the engine would.
 */
export const previewCustomRule = async ({
  esClient,
  index,
  spec,
  signal,
  pageSize = MATCHER_PAGE_SIZE,
}: {
  esClient: ElasticsearchClient;
  index: string;
  spec: EsqlExpressionMatchSpec;
  signal?: AbortSignal;
  pageSize?: number;
}): Promise<CustomRulePreview> => {
  const preview: CustomRulePreview = {
    scanned_groups: 0,
    truncated: false,
    partial: false,
    would_link_groups: 0,
    would_extend_existing_groups: 0,
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
    if (signal?.aborted) {
      throw new Error('Custom rule preview aborted');
    }
    const response = await executeEsqlQuery({
      esClient,
      signal,
      query: buildMatchGroupsQuery({ index, spec, afterMatchValue, pageSize }),
    });
    preview.partial ||= isPartialEsqlResponse(response);
    const rows = parseMatchGroupRows(response);

    for (const row of rows) {
      preview.scanned_groups++;
      const verdict = classifyMatchGroup(row, spec.declineSameNamespaceDuplicates);
      if (verdict === 'oversized') {
        preview.skipped.oversized++;
      } else if (verdict === 'same_namespace_duplicates') {
        preview.skipped.same_namespace_duplicates++;
      } else if (verdict === 'nothing_to_link' || !hasSomethingToLink(row)) {
        preview.skipped.nothing_to_link++;
      } else {
        preview.would_link_groups++;
        const distinctExistingTargetCount = new Set(row.existingTargetIds).size;
        if (distinctExistingTargetCount >= 1) {
          preview.would_extend_existing_groups++;
        }
        if (distinctExistingTargetCount >= 2) {
          preview.would_merge_existing_groups++;
        }
        keepLargest(sampleRows, row);
      }
    }

    if (rows.length < pageSize) {
      break;
    }
    afterMatchValue = rows[rows.length - 1].matchValue;
  }

  const { sample, partial } = await buildSample(esClient, index, sampleRows, signal);
  preview.sample = sample;
  preview.partial ||= partial;
  return preview;
};
