/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { KiDeletedError, KiValidationError } from '../ai_indices/errors';
import { getKiRevision } from '../ai_indices/ki_revision';
import { updateKi } from '../ai_indices/ki_write';
import { setOntologyStatus } from './set_status';

jest.mock('../ai_indices/ki_revision', () => ({
  ...jest.requireActual('../ai_indices/ki_revision'),
  getKiRevision: jest.fn(),
}));
jest.mock('../ai_indices/ki_write', () => ({ updateKi: jest.fn() }));

const esClient = {} as ElasticsearchClient;
const writer = { uri: 'api://context_engine.ki.update', metadata: { space_id: 'default' } };
const params = {
  aiIndexId: 'shop',
  dest: { type: 'index' as const, value: 'ai-index-idx-shop' },
  kiId: 'ontology-term--customer',
  status: 'certified' as const,
  writer,
};

const revisionOf = (source: Record<string, unknown>) => ({
  index: 'ai-index-idx-shop',
  documentId: 'ontology-term--customer',
  source,
});

describe('setOntologyStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(updateKi).mockResolvedValue({ id: params.kiId, result: 'updated' });
  });

  it('sets the status attribute, keeping the other attributes', async () => {
    jest.mocked(getKiRevision).mockResolvedValue(
      revisionOf({
        type: 'ontology.term',
        attributes: { 'ontology.status': 'draft', 'ontology.synonyms': ['client'] },
      })
    );

    await expect(setOntologyStatus(esClient, params)).resolves.toEqual({
      id: params.kiId,
      result: 'updated',
    });
    expect(updateKi).toHaveBeenCalledWith(esClient, {
      aiIndexId: 'shop',
      dest: params.dest,
      kiId: params.kiId,
      ki: {
        attributes: { 'ontology.status': 'certified', 'ontology.synonyms': ['client'] },
      },
      writer,
    });
  });

  it('refuses KIs that are not ontology KIs, and deleted ones', async () => {
    jest.mocked(getKiRevision).mockResolvedValue(revisionOf({ type: 'fact.preference' }));
    await expect(setOntologyStatus(esClient, params)).rejects.toBeInstanceOf(KiValidationError);

    jest
      .mocked(getKiRevision)
      .mockResolvedValue(
        revisionOf({ type: 'ontology.term', governance: { lifecycle: { status: 'deleted' } } })
      );
    await expect(setOntologyStatus(esClient, params)).rejects.toBeInstanceOf(KiDeletedError);
    expect(updateKi).not.toHaveBeenCalled();
  });
});
