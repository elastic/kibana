/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { AiIndexDest } from '../../common/http_api/ai_indices';
import {
  ONTOLOGY_FIELDS_ATTRIBUTE,
  ONTOLOGY_INDEX_ATTRIBUTE,
  ONTOLOGY_STATUS_ATTRIBUTE,
  ONTOLOGY_SYNONYMS_ATTRIBUTE,
  ONTOLOGY_TYPE_PREFIX,
  type OntologyStatus,
} from '../../common/ontology';
import { buildAiIndexSpaceFilter } from '../../common/space_filter';
import type { ExistingOntologyKi } from '../../common/step_types/catalog_ontology_sources';
import type { DreamedKi } from '../dreaming/dreamed_ki';

/** Ontology KIs one read returns. */
export const MAX_EXISTING_ONTOLOGY_KIS = 500;

const INACTIVE_STATUSES: ReadonlySet<string> = new Set(['deleted', 'verification_failed']);

const stringsOf = (value: unknown): string[] | undefined => {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === 'string');
  }
  return typeof value === 'string' ? [value] : undefined;
};

/** The review status of an ontology KI; unset reads as draft. */
export const ontologyStatusOf = (ki: Pick<DreamedKi, 'attributes'> | undefined): OntologyStatus =>
  ki?.attributes?.[ONTOLOGY_STATUS_ATTRIBUTE] === 'certified' ? 'certified' : 'draft';

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
  const fields = stringsOf(ki.attributes?.[ONTOLOGY_FIELDS_ATTRIBUTE]);
  const synonyms = stringsOf(ki.attributes?.[ONTOLOGY_SYNONYMS_ATTRIBUTE]);
  return {
    id: ki.id,
    type: ki.type,
    title: ki.title,
    ...(ki.description !== undefined && { description: ki.description }),
    status: ontologyStatusOf(ki),
    ...(typeof index === 'string' && { index }),
    ...(fields && { fields }),
    ...(synonyms && { synonyms }),
  };
};
