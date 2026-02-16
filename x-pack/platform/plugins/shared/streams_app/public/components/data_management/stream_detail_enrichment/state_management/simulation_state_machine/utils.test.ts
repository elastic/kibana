/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamlangStepWithUIAttributes } from '@kbn/streamlang';
import { ALWAYS_CONDITION } from '@kbn/streamlang';
import type { SampleDocumentWithUIAttributes, Simulation } from './types';
import {
  collectActiveDocumentsForSelectedCondition,
  collectDescendantProcessorIdsForCondition,
  collectDocumentsAffectedByProcessors,
  getOriginalSampleDocument,
} from './utils';

const makeAction = (
  id: string,
  parentId: StreamlangStepWithUIAttributes['parentId'] = null
): StreamlangStepWithUIAttributes =>
  ({
    customIdentifier: id,
    parentId,
    action: 'set',
    from: 'foo',
    to: 'bar',
    where: ALWAYS_CONDITION,
  } as StreamlangStepWithUIAttributes);

const makeCondition = (
  id: string,
  parentId: StreamlangStepWithUIAttributes['parentId'] = null
): StreamlangStepWithUIAttributes =>
  ({
    customIdentifier: id,
    parentId,
    where: { ...ALWAYS_CONDITION },
  } as StreamlangStepWithUIAttributes);

const steps: StreamlangStepWithUIAttributes[] = [
  makeAction('p1'),
  makeCondition('c1'),
  makeAction('p2', 'c1'),
  makeCondition('c2', 'c1'),
  makeAction('p3', 'c2'),
  makeAction('p4'),
];

describe('Simulation utils', () => {
  describe('collectDescendantProcessorIdsForCondition', () => {
    it('returns only processor ids inside a condition subtree', () => {
      const ids = collectDescendantProcessorIdsForCondition(steps, 'c1');
      expect(ids).toEqual(['p2', 'p3']);
    });

    it('returns empty when no processors are found', () => {
      expect(collectDescendantProcessorIdsForCondition(steps, 'missing')).toEqual([]);
    });
  });

  describe('collectDocumentsAffectedByProcessors', () => {
    it('filters documents that were processed by target processors', () => {
      const documents = [
        { processed_by: ['p1'], status: 'parsed', value: {}, errors: [], metrics: {} },
        { processed_by: ['p3'], status: 'parsed', value: {}, errors: [], metrics: {} },
      ] as unknown as Simulation['documents'];

      const filtered = collectDocumentsAffectedByProcessors(documents, ['p3']);
      expect(filtered).toEqual([documents[1]]);
    });

    it('returns empty when no documents or no processor ids', () => {
      const documents = [
        { processed_by: ['p1'], status: 'parsed', value: {}, errors: [], metrics: {} },
      ] as unknown as Simulation['documents'];

      expect(collectDocumentsAffectedByProcessors(undefined, ['p1'])).toEqual([]);
      expect(collectDocumentsAffectedByProcessors(documents, [])).toEqual([]);
    });
  });

  describe('collectActiveDocumentsForSelectedCondition', () => {
    const documents = [
      { processed_by: ['p1'], status: 'parsed', value: {}, errors: [], metrics: {} },
      { processed_by: ['p3'], status: 'parsed', value: {}, errors: [], metrics: {} },
    ] as unknown as Simulation['documents'];

    it('returns all documents when no condition is selected', () => {
      expect(collectActiveDocumentsForSelectedCondition(documents, steps, undefined)).toEqual(
        documents
      );
    });

    it('returns only documents touched by processors in the selected condition', () => {
      const filtered = collectActiveDocumentsForSelectedCondition(documents, steps, 'c1');
      expect(filtered).toEqual([documents[1]]);
    });

    it('returns empty when documents are undefined', () => {
      expect(collectActiveDocumentsForSelectedCondition(undefined, steps, 'c1')).toEqual([]);
    });
  });

  describe('getOriginalSampleDocument', () => {
    const createSample = (id: string): SampleDocumentWithUIAttributes => ({
      dataSourceId: 'test-source',
      document: { id, message: `Sample ${id}` },
    });

    const samples: SampleDocumentWithUIAttributes[] = [
      createSample('sample-0'),
      createSample('sample-1'),
      createSample('sample-2'),
    ];

    it('returns the document at the specified index', () => {
      expect(getOriginalSampleDocument(samples, 0)).toEqual(samples[0].document);
      expect(getOriginalSampleDocument(samples, 1)).toEqual(samples[1].document);
      expect(getOriginalSampleDocument(samples, 2)).toEqual(samples[2].document);
    });

    it('returns undefined when index is out of bounds', () => {
      // This is the key edge case: when samples are re-filtered and the
      // currentDoc.index becomes invalid (out of bounds)
      expect(getOriginalSampleDocument(samples, 3)).toBeUndefined();
      expect(getOriginalSampleDocument(samples, 100)).toBeUndefined();
      expect(getOriginalSampleDocument(samples, -1)).toBeUndefined();
    });

    it('returns undefined when originalSamples is undefined', () => {
      expect(getOriginalSampleDocument(undefined, 0)).toBeUndefined();
    });

    it('returns undefined when originalSamples is empty', () => {
      expect(getOriginalSampleDocument([], 0)).toBeUndefined();
    });

    it('returns undefined when currentDocIndex is undefined', () => {
      expect(getOriginalSampleDocument(samples, undefined)).toBeUndefined();
    });
  });
});
