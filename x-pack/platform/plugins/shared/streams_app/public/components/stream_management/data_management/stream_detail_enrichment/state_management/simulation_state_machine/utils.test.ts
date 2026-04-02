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
  getSourceField,
  getTargetField,
  getTableColumns,
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

  describe('getSourceField', () => {
    it('returns from for grok processor', () => {
      expect(getSourceField({ action: 'grok', from: 'message' } as any)).toBe('message');
    });

    it('returns from for dissect processor', () => {
      expect(getSourceField({ action: 'dissect', from: 'message' } as any)).toBe('message');
    });

    it('returns to for set processor', () => {
      expect(getSourceField({ action: 'set', to: 'target_field' } as any)).toBe('target_field');
    });

    it('returns from for split processor', () => {
      expect(getSourceField({ action: 'split', from: 'tags' } as any)).toBe('tags');
    });

    it('returns from for replace processor', () => {
      expect(getSourceField({ action: 'replace', from: 'message' } as any)).toBe('message');
    });

    it('returns from for redact processor', () => {
      expect(getSourceField({ action: 'redact', from: 'message' } as any)).toBe('message');
    });

    it('returns from for uppercase processor', () => {
      expect(getSourceField({ action: 'uppercase', from: 'name' } as any)).toBe('name');
    });

    it('returns from for lowercase processor', () => {
      expect(getSourceField({ action: 'lowercase', from: 'name' } as any)).toBe('name');
    });

    it('returns from for trim processor', () => {
      expect(getSourceField({ action: 'trim', from: 'value' } as any)).toBe('value');
    });

    it('returns from for sort processor', () => {
      expect(getSourceField({ action: 'sort', from: 'items' } as any)).toBe('items');
    });

    it('returns from for remove processor', () => {
      expect(getSourceField({ action: 'remove', from: 'unwanted' } as any)).toBe('unwanted');
    });

    it('returns from for remove_by_prefix processor', () => {
      expect(getSourceField({ action: 'remove_by_prefix', from: 'temp.' } as any)).toBe('temp.');
    });

    it('returns to for math processor', () => {
      expect(getSourceField({ action: 'math', to: 'result' } as any)).toBe('result');
    });

    it('returns to for concat processor', () => {
      expect(getSourceField({ action: 'concat', to: 'full_name' } as any)).toBe('full_name');
    });

    it('returns undefined for enrich processor (no from field)', () => {
      expect(getSourceField({ action: 'enrich', policy_name: 'my_policy' } as any)).toBeUndefined();
    });

    it('returns first element of from for join processor', () => {
      expect(getSourceField({ action: 'join', from: ['field_a', 'field_b'] } as any)).toBe(
        'field_a'
      );
    });

    it('returns undefined for manual_ingest_pipeline processor', () => {
      expect(
        getSourceField({ action: 'manual_ingest_pipeline' } as any)
      ).toBeUndefined();
    });

    it('returns undefined for drop_document processor', () => {
      expect(getSourceField({ action: 'drop_document' } as any)).toBeUndefined();
    });

    it('returns undefined when from is empty string', () => {
      expect(getSourceField({ action: 'grok', from: '' } as any)).toBeUndefined();
    });

    it('returns undefined when from is whitespace only', () => {
      expect(getSourceField({ action: 'grok', from: '   ' } as any)).toBeUndefined();
    });
  });

  describe('getTargetField', () => {
    it('returns to for convert with explicit to', () => {
      expect(
        getTargetField({ action: 'convert', from: 'status', to: 'status_int' } as any)
      ).toBe('status_int');
    });

    it('returns undefined for convert without to', () => {
      expect(getTargetField({ action: 'convert', from: 'status' } as any)).toBeUndefined();
    });

    it('returns to for split with explicit to', () => {
      expect(
        getTargetField({ action: 'split', from: 'tags', to: 'tags_array' } as any)
      ).toBe('tags_array');
    });

    it('returns to for rename', () => {
      expect(
        getTargetField({ action: 'rename', from: 'old_name', to: 'new_name' } as any)
      ).toBe('new_name');
    });

    it('returns to for date with explicit to', () => {
      expect(
        getTargetField({ action: 'date', from: 'raw_date', to: '@timestamp' } as any)
      ).toBe('@timestamp');
    });

    it('returns to for replace with explicit to', () => {
      expect(
        getTargetField({ action: 'replace', from: 'message', to: 'clean_message' } as any)
      ).toBe('clean_message');
    });

    it('returns to for uppercase with explicit to', () => {
      expect(
        getTargetField({ action: 'uppercase', from: 'name', to: 'name_upper' } as any)
      ).toBe('name_upper');
    });

    it('returns undefined for grok (pattern-defined outputs)', () => {
      expect(
        getTargetField({ action: 'grok', from: 'message', patterns: ['%{GREEDYDATA:data}'] } as any)
      ).toBeUndefined();
    });

    it('returns undefined for dissect', () => {
      expect(
        getTargetField({ action: 'dissect', from: 'message', pattern: '%{data}' } as any)
      ).toBeUndefined();
    });

    it('returns undefined for remove (no target)', () => {
      expect(getTargetField({ action: 'remove', from: 'unwanted' } as any)).toBeUndefined();
    });

    it('returns undefined when to is empty string', () => {
      expect(
        getTargetField({ action: 'convert', from: 'status', to: '' } as any)
      ).toBeUndefined();
    });

    it('returns to for enrich processor', () => {
      expect(
        getTargetField({ action: 'enrich', policy_name: 'my_policy', to: 'enriched_field' } as any)
      ).toBe('enriched_field');
    });

    it('returns to for join processor', () => {
      expect(
        getTargetField({ action: 'join', from: ['field_a', 'field_b'], to: 'joined' } as any)
      ).toBe('joined');
    });

    it('returns undefined when to equals from (no extra column needed)', () => {
      expect(
        getTargetField({ action: 'convert', from: 'status', to: 'status' } as any)
      ).toBeUndefined();
    });
  });

  describe('getTableColumns', () => {
    it('returns source + target + detected fields with no duplicates', () => {
      const result = getTableColumns({
        currentProcessorSourceField: 'tags',
        currentProcessorTargetField: 'tags_array',
        detectedFields: [{ name: 'tags_array' }, { name: 'other_field' }] as any,
        previewDocsFilter: 'outcome_filter_all',
      });
      expect(result).toEqual(['tags', 'tags_array', 'other_field']);
    });

    it('returns only source field for failed/skipped docs', () => {
      const result = getTableColumns({
        currentProcessorSourceField: 'tags',
        currentProcessorTargetField: 'tags_array',
        detectedFields: [{ name: 'detected' }] as any,
        previewDocsFilter: 'outcome_filter_failed',
      });
      expect(result).toEqual(['tags']);
    });

    it('returns empty when no source field', () => {
      const result = getTableColumns({
        currentProcessorSourceField: undefined,
        currentProcessorTargetField: 'tags_array',
        detectedFields: [{ name: 'detected' }] as any,
        previewDocsFilter: 'outcome_filter_all',
      });
      expect(result).toEqual([]);
    });

    it('includes target field before simulation (no detected fields)', () => {
      const result = getTableColumns({
        currentProcessorSourceField: 'tags',
        currentProcessorTargetField: 'tags_array',
        detectedFields: [],
        previewDocsFilter: 'outcome_filter_all',
      });
      expect(result).toEqual(['tags', 'tags_array']);
    });

    it('works without target field (backwards compatible)', () => {
      const result = getTableColumns({
        currentProcessorSourceField: 'tags',
        detectedFields: [{ name: 'detected' }] as any,
        previewDocsFilter: 'outcome_filter_all',
      });
      expect(result).toEqual(['tags', 'detected']);
    });
  });
});
