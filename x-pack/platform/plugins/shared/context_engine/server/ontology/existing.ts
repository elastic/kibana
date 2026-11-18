/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { AiIndexDest } from '../../common/http_api/ai_indices';
import {
  ONTOLOGY_DATASET_KI_TYPE,
  ONTOLOGY_ENTITY_TYPE_ATTRIBUTE,
  ONTOLOGY_FIELDS_ATTRIBUTE,
  ONTOLOGY_INDEX_ATTRIBUTE,
  ONTOLOGY_JOIN_FIELDS_ATTRIBUTE,
  ONTOLOGY_KIND_ATTRIBUTE,
  ONTOLOGY_SYNONYMS_ATTRIBUTE,
  ONTOLOGY_TYPE_PREFIX,
} from '../../common/ontology';
import { buildAiIndexSpaceFilter } from '../../common/space_filter';
import type {
  ExistingOntologyKi,
  OntologyCatalogEntry,
} from '../../common/step_types/catalog_ontology_sources';
import type { DreamedKi } from '../dreaming/dreamed_ki';
import { sourceIdFromUri } from './ids';

/** Ontology KIs one read returns. */
export const MAX_EXISTING_ONTOLOGY_KIS = 500;

const INACTIVE_STATUSES: ReadonlySet<string> = new Set(['deleted', 'verification_failed']);
const DATASET_KINDS: ReadonlySet<string> = new Set(['index', 'data_stream', 'alias']);

/** An attribute's strings: a list as it is, a single string as a list of one. */
export const stringsOf = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === 'string');
  }
  return typeof value === 'string' ? [value] : [];
};

/** The ids of the sources an ontology KI cites. */
export const sourceIdsOf = (ki: Pick<DreamedKi, 'references'> | undefined): string[] =>
  (ki?.references ?? []).flatMap(({ uri, relation }) => {
    const sourceId = relation === 'derived_from' ? sourceIdFromUri(uri) : undefined;
    return sourceId !== undefined ? [sourceId] : [];
  });

/** The latest revision of each ontology KI visible in the space, leaving out deleted ones. */
export const readOntologyKis = async ({
  esClient,
  dest,
  spaceId,
  size = MAX_EXISTING_ONTOLOGY_KIS,
  abortSignal,
}: {
  esClient: ElasticsearchClient;
  dest: AiIndexDest;
  spaceId: string;
  size?: number;
  abortSignal?: AbortSignal;
}): Promise<DreamedKi[]> => {
  const response = await esClient.search<DreamedKi>(
    {
      index: dest.value,
      ignore_unavailable: true,
      allow_no_indices: true,
      size,
      sort: [{ updated_at: { order: 'desc' } }],
      collapse: { field: 'id' },
      _source: [
        'id',
        'type',
        'title',
        'description',
        'content',
        'attributes',
        'references',
        'permissions',
        'governance.lifecycle.status',
        'updated_at',
      ],
      query: {
        bool: {
          filter: [{ prefix: { type: ONTOLOGY_TYPE_PREFIX } }, buildAiIndexSpaceFilter(spaceId)],
        },
      },
    },
    { signal: abortSignal }
  );
  return (response?.hits?.hits ?? []).flatMap(({ _source: source }) =>
    source && !INACTIVE_STATUSES.has(source.governance?.lifecycle?.status ?? '') ? [source] : []
  );
};

/** An ontology KI as the prompts read it. */
export const toExistingOntologyKi = (ki: DreamedKi): ExistingOntologyKi => {
  const index = ki.attributes?.[ONTOLOGY_INDEX_ATTRIBUTE];
  const entityType = ki.attributes?.[ONTOLOGY_ENTITY_TYPE_ATTRIBUTE];
  const fields = stringsOf(ki.attributes?.[ONTOLOGY_FIELDS_ATTRIBUTE]);
  const synonyms = stringsOf(ki.attributes?.[ONTOLOGY_SYNONYMS_ATTRIBUTE]);
  return {
    id: ki.id,
    type: ki.type,
    title: ki.title,
    ...(ki.description !== undefined && { description: ki.description }),
    ...(typeof index === 'string' && { index }),
    ...(typeof entityType === 'string' && { entity_type: entityType }),
    ...(fields.length > 0 && { fields }),
    ...(synonyms.length > 0 && { synonyms }),
  };
};

/**
 * The index datasets other sources described, as catalog entries holding the fields they recorded
 * as join targets, so a source can check joins across sources.
 */
export const otherDatasetsOf = (
  kis: readonly DreamedKi[],
  ownNames: ReadonlySet<string>
): OntologyCatalogEntry[] =>
  kis.flatMap((ki) => {
    const name = ki.attributes?.[ONTOLOGY_INDEX_ATTRIBUTE];
    const kind = ki.attributes?.[ONTOLOGY_KIND_ATTRIBUTE];
    if (
      ki.type !== ONTOLOGY_DATASET_KI_TYPE ||
      typeof name !== 'string' ||
      ownNames.has(name) ||
      typeof kind !== 'string' ||
      !DATASET_KINDS.has(kind)
    ) {
      return [];
    }
    return [
      {
        name,
        kind: kind as OntologyCatalogEntry['kind'],
        source_ids: sourceIdsOf(ki),
        fields: stringsOf(ki.attributes?.[ONTOLOGY_JOIN_FIELDS_ATTRIBUTE]).flatMap((entry) => {
          const separator = entry.lastIndexOf(':');
          return separator > 0
            ? [
                {
                  name: entry.slice(0, separator),
                  type: entry.slice(separator + 1),
                  searchable: true,
                  aggregatable: true,
                },
              ]
            : [];
        }),
      },
    ];
  });
