/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { AiIndexDest } from '../../common/http_api/ai_indices';
import {
  ONTOLOGY_STATUS_ATTRIBUTE,
  isOntologyKiType,
  type OntologyStatus,
} from '../../common/ontology';
import { KiDeletedError, KiValidationError } from '../ai_indices/errors';
import { getKiRevision, isKiDeleted, type KiWriter } from '../ai_indices/ki_revision';
import { updateKi } from '../ai_indices/ki_write';
import type { DreamedKi } from '../dreaming/dreamed_ki';

/**
 * Sets the review status of an ontology KI. A certified KI is left alone by ontology discovery;
 * setting it back to draft lets discovery update it again.
 */
export const setOntologyStatus = async (
  esClient: ElasticsearchClient,
  {
    aiIndexId,
    dest,
    kiId,
    status,
    writer,
  }: {
    aiIndexId: string;
    dest: AiIndexDest;
    kiId: string;
    status: OntologyStatus;
    writer: KiWriter;
  }
): Promise<{ id: string; result: 'updated' | 'noop' }> => {
  const revision = await getKiRevision({ esClient, aiIndexId, dest, kiId, includeSource: true });
  const source = revision.source as Partial<DreamedKi>;
  if (isKiDeleted(revision.source)) {
    throw new KiDeletedError(aiIndexId, kiId, 'restore the deleted KI before reviewing it');
  }
  if (typeof source.type !== 'string' || !isOntologyKiType(source.type)) {
    throw new KiValidationError(
      `KI '${kiId}' in AI index '${aiIndexId}' is not an ontology dataset or term`
    );
  }
  return updateKi(esClient, {
    aiIndexId,
    dest,
    kiId,
    ki: { attributes: { ...source.attributes, [ONTOLOGY_STATUS_ATTRIBUTE]: status } },
    writer,
  });
};
