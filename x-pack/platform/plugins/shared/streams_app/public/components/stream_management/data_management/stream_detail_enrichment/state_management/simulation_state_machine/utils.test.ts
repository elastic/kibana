/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  StreamlangProcessorDefinitionWithUIAttributes,
  StreamlangStepWithUIAttributes,
} from '@kbn/streamlang';
import { ALWAYS_CONDITION } from '@kbn/streamlang';
import type { DetectedField, SampleDocumentWithUIAttributes, Simulation } from './types';
import {
  collectActiveDocumentsForSelectedCondition,
  collectDescendantProcessorIdsForCondition,
  collectDocumentsAffectedByProcessors,
  getDestinationField,
  getOriginalSampleDocument,
  getSourceFields,
  getTableColumns,
} from './utils';

const makeProcessor = (processor: Record<string, unknown>) =>
  processor as unknown as StreamlangProcessorDefinitionWithUIAttributes;

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
    // Note: Documents now include condition IDs directly in processed_by,
    // as the simulation backend injects condition-noop processors tagged with condition IDs.
    const documents = [
      { processed_by: ['p1'], status: 'parsed', value: {}, errors: [], metrics: {} },
      { processed_by: ['c1', 'p3'], status: 'parsed', value: {}, errors: [], metrics: {} },
    ] as unknown as Simulation['documents'];

    it('returns all documents when no condition is selected', () => {
      expect(collectActiveDocumentsForSelectedCondition(documents, undefined)).toEqual(documents);
    });

    it('returns only documents touched by the selected condition noop processor', () => {
      const filtered = collectActiveDocumentsForSelectedCondition(documents, 'c1');
      expect(filtered).toEqual([documents[1]]);
    });

    it('returns empty when documents are undefined', () => {
      expect(collectActiveDocumentsForSelectedCondition(undefined, 'c1')).toEqual([]);
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

  describe('getSourceFields', () => {
    it('returns [from] for single-source processors', () => {
      expect(getSourceFields(makeProcessor({ action: 'grok', from: 'message' }))).toEqual([
        'message',
      ]);
      expect(getSourceFields(makeProcessor({ action: 'replace', from: 'src', to: 'dst' }))).toEqual(
        ['src']
      );
      expect(
        getSourceFields(makeProcessor({ action: 'uppercase', from: 'field', to: 'out' }))
      ).toEqual(['field']);
      expect(getSourceFields(makeProcessor({ action: 'trim', from: 'field', to: 'out' }))).toEqual([
        'field',
      ]);
    });

    it('returns source_ip and destination_ip for network_direction', () => {
      expect(
        getSourceFields(
          makeProcessor({
            action: 'network_direction',
            source_ip: 'source.ip',
            destination_ip: 'destination.ip',
            target_field: 'network.direction',
          })
        )
      ).toEqual(['source.ip', 'destination.ip']);
    });

    it('returns only field entries for concat with mixed from entries', () => {
      expect(
        getSourceFields(
          makeProcessor({
            action: 'concat',
            from: [
              { type: 'field', value: 'a' },
              { type: 'literal', value: '-' },
              { type: 'field', value: 'b' },
            ],
            to: 'joined',
          })
        )
      ).toEqual(['a', 'b']);
    });

    it('returns all from fields for join', () => {
      expect(
        getSourceFields(makeProcessor({ action: 'join', from: ['a', 'b', 'c'], to: 'joined' }))
      ).toEqual(['a', 'b', 'c']);
    });

    it('returns copy_from for set when copying, empty when using literal value', () => {
      expect(
        getSourceFields(makeProcessor({ action: 'set', to: 'dest', copy_from: 'src' }))
      ).toEqual(['src']);
      expect(
        getSourceFields(makeProcessor({ action: 'set', to: 'dest', value: 'literal' }))
      ).toEqual([]);
    });

    it('returns empty array for destination-only and excluded processors', () => {
      expect(
        getSourceFields(makeProcessor({ action: 'math', expression: 'a+b', to: 'sum' }))
      ).toEqual([]);
      expect(
        getSourceFields(makeProcessor({ action: 'enrich', policy_name: 'policy', to: 'out' }))
      ).toEqual([]);
      expect(getSourceFields(makeProcessor({ action: 'append', to: 'dest', value: 'x' }))).toEqual(
        []
      );
      expect(getSourceFields(makeProcessor({ action: 'remove', from: 'x' }))).toEqual([]);
      expect(getSourceFields(makeProcessor({ action: 'drop_document' }))).toEqual([]);
    });

    it('trims whitespace and drops empty values', () => {
      expect(getSourceFields(makeProcessor({ action: 'grok', from: '  message  ' }))).toEqual([
        'message',
      ]);
      expect(getSourceFields(makeProcessor({ action: 'grok', from: '   ' }))).toEqual([]);
      expect(
        getSourceFields(
          makeProcessor({
            action: 'concat',
            from: [
              { type: 'field', value: '  a  ' },
              { type: 'field', value: '   ' },
              { type: 'field', value: '' },
            ],
            to: 'joined',
          })
        )
      ).toEqual(['a']);
    });
  });

  describe('getDestinationField', () => {
    it('returns to for processors with destination field', () => {
      expect(getDestinationField(makeProcessor({ action: 'rename', from: 'a', to: 'b' }))).toBe(
        'b'
      );
      expect(getDestinationField(makeProcessor({ action: 'replace', from: 'a', to: 'b' }))).toBe(
        'b'
      );
      expect(getDestinationField(makeProcessor({ action: 'split', from: 'a', to: 'b' }))).toBe('b');
      expect(
        getDestinationField(
          makeProcessor({
            action: 'concat',
            from: [{ type: 'field', value: 'a' }],
            to: 'joined',
          })
        )
      ).toBe('joined');
      expect(
        getDestinationField(makeProcessor({ action: 'join', from: ['a'], to: 'joined' }))
      ).toBe('joined');
      expect(
        getDestinationField(makeProcessor({ action: 'math', expression: 'a+b', to: 'sum' }))
      ).toBe('sum');
      expect(
        getDestinationField(makeProcessor({ action: 'enrich', policy_name: 'p', to: 'out' }))
      ).toBe('out');
      expect(getDestinationField(makeProcessor({ action: 'set', to: 'dest', value: 'x' }))).toBe(
        'dest'
      );
    });

    it('returns target_field for network_direction', () => {
      expect(
        getDestinationField(
          makeProcessor({
            action: 'network_direction',
            source_ip: 'a',
            destination_ip: 'b',
            target_field: 'network.direction',
          })
        )
      ).toBe('network.direction');
      expect(
        getDestinationField(
          makeProcessor({
            action: 'network_direction',
            source_ip: 'a',
            destination_ip: 'b',
          })
        )
      ).toBeUndefined();
    });

    it('returns undefined for grok, dissect, redact, and remove', () => {
      expect(
        getDestinationField(makeProcessor({ action: 'grok', from: 'message' }))
      ).toBeUndefined();
      expect(
        getDestinationField(makeProcessor({ action: 'dissect', from: 'message', pattern: '%{}' }))
      ).toBeUndefined();
      expect(
        getDestinationField(makeProcessor({ action: 'redact', from: 'field' }))
      ).toBeUndefined();
      expect(getDestinationField(makeProcessor({ action: 'remove', from: 'x' }))).toBeUndefined();
    });

    it('returns undefined when to is missing or whitespace', () => {
      expect(getDestinationField(makeProcessor({ action: 'split', from: 'a' }))).toBeUndefined();
      expect(
        getDestinationField(makeProcessor({ action: 'rename', from: 'a', to: '   ' }))
      ).toBeUndefined();
    });

    it('trims destination field values', () => {
      expect(
        getDestinationField(makeProcessor({ action: 'rename', from: 'a', to: '  out  ' }))
      ).toBe('out');
    });
  });

  describe('getTableColumns', () => {
    it('returns empty array when no source fields and no destination', () => {
      expect(
        getTableColumns({
          currentProcessorSourceFields: [],
          previewDocsFilter: 'outcome_filter_all',
        })
      ).toEqual([]);
    });

    it('returns uniq base fields plus detected fields for outcome_filter_all', () => {
      expect(
        getTableColumns({
          currentProcessorSourceFields: ['a', 'b'],
          currentProcessorDestinationField: 'c',
          detectedFields: [{ name: 'd' }] as unknown as DetectedField[],
          previewDocsFilter: 'outcome_filter_all',
        })
      ).toEqual(['a', 'b', 'c', 'd']);
    });

    it('returns only base fields for outcome_filter_failed', () => {
      expect(
        getTableColumns({
          currentProcessorSourceFields: ['a', 'b'],
          currentProcessorDestinationField: 'c',
          detectedFields: [{ name: 'd' }] as unknown as DetectedField[],
          previewDocsFilter: 'outcome_filter_failed',
        })
      ).toEqual(['a', 'b', 'c']);
    });

    it('dedupes when a detected field equals a base field', () => {
      expect(
        getTableColumns({
          currentProcessorSourceFields: ['a'],
          currentProcessorDestinationField: 'b',
          detectedFields: [{ name: 'a' }, { name: 'c' }] as unknown as DetectedField[],
          previewDocsFilter: 'outcome_filter_all',
        })
      ).toEqual(['a', 'b', 'c']);
    });

    it('returns destination and detected fields when no source fields', () => {
      expect(
        getTableColumns({
          currentProcessorSourceFields: [],
          currentProcessorDestinationField: 'c',
          detectedFields: [{ name: 'd' }] as unknown as DetectedField[],
          previewDocsFilter: 'outcome_filter_all',
        })
      ).toEqual(['c', 'd']);
    });
  });
});
