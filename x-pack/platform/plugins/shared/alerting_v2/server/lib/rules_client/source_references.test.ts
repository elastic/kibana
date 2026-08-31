/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RULE_TEMPLATE_SOURCE_TYPE } from '@kbn/alerting-v2-constants';
import { RULE_TEMPLATE_SAVED_OBJECT_TYPE } from '../../../common/saved_object_types';
import {
  extractSourceReferences,
  rebuildSourceReferences,
  injectSourceReferences,
} from './source_references';

describe('source_references', () => {
  describe('extractSourceReferences', () => {
    it('extracts a reference for rule_template source type', () => {
      const refs = extractSourceReferences({
        type: RULE_TEMPLATE_SOURCE_TYPE,
        data: { template_id: 'nginx-error-rate' },
      });

      expect(refs).toEqual([
        {
          name: 'source:template_id',
          type: RULE_TEMPLATE_SAVED_OBJECT_TYPE,
          id: 'nginx-error-rate',
        },
      ]);
    });

    it('returns [] when source is undefined', () => {
      expect(extractSourceReferences(undefined)).toEqual([]);
    });

    it('returns [] for an unknown source type', () => {
      const refs = extractSourceReferences({
        type: 'content_pack',
        data: { pack_id: 'my-pack' },
      });
      expect(refs).toEqual([]);
    });

    it('returns [] when template_id is empty', () => {
      const refs = extractSourceReferences({
        type: RULE_TEMPLATE_SOURCE_TYPE,
        data: { template_id: '' },
      });
      expect(refs).toEqual([]);
    });

    it('returns [] when template_id is not a string', () => {
      const refs = extractSourceReferences({
        type: RULE_TEMPLATE_SOURCE_TYPE,
        data: { template_id: 123 },
      });
      expect(refs).toEqual([]);
    });
  });

  describe('rebuildSourceReferences', () => {
    it('regenerates source refs and preserves non-source refs', () => {
      const artifactRef = { name: 'artifact:dashboardId:dash-1', type: 'dashboard', id: 'abc' };
      const result = rebuildSourceReferences({
        source: { type: RULE_TEMPLATE_SOURCE_TYPE, data: { template_id: 'new-template' } },
        previousReferences: [
          { name: 'source:template_id', type: RULE_TEMPLATE_SAVED_OBJECT_TYPE, id: 'old-template' },
          artifactRef,
        ],
      });

      expect(result).toEqual([
        artifactRef,
        { name: 'source:template_id', type: RULE_TEMPLATE_SAVED_OBJECT_TYPE, id: 'new-template' },
      ]);
    });

    it('drops source refs when source is undefined (cleared)', () => {
      const result = rebuildSourceReferences({
        source: undefined,
        previousReferences: [
          { name: 'source:template_id', type: RULE_TEMPLATE_SAVED_OBJECT_TYPE, id: 'old' },
        ],
      });

      expect(result).toEqual([]);
    });

    it('handles undefined previousReferences', () => {
      const result = rebuildSourceReferences({
        source: { type: RULE_TEMPLATE_SOURCE_TYPE, data: { template_id: 'tpl-1' } },
        previousReferences: undefined,
      });

      expect(result).toEqual([
        { name: 'source:template_id', type: RULE_TEMPLATE_SAVED_OBJECT_TYPE, id: 'tpl-1' },
      ]);
    });
  });

  describe('injectSourceReferences', () => {
    it('overwrites data.template_id from the live reference', () => {
      const result = injectSourceReferences(
        { type: RULE_TEMPLATE_SOURCE_TYPE, data: { template_id: 'stale-id' } },
        [{ name: 'source:template_id', type: RULE_TEMPLATE_SAVED_OBJECT_TYPE, id: 'remapped-id' }]
      );

      expect(result).toEqual({
        type: RULE_TEMPLATE_SOURCE_TYPE,
        data: { template_id: 'remapped-id' },
      });
    });

    it('returns source unchanged when no matching reference exists', () => {
      const source = { type: RULE_TEMPLATE_SOURCE_TYPE, data: { template_id: 'original' } };
      const result = injectSourceReferences(source, []);
      expect(result).toEqual(source);
    });

    it('returns undefined when source is undefined', () => {
      expect(injectSourceReferences(undefined, [])).toBeUndefined();
    });

    it('returns source unchanged for unknown source types', () => {
      const source = { type: 'prebuilt_rule', data: { rule_id: 'abc' } };
      const result = injectSourceReferences(source, [
        { name: 'source:template_id', type: RULE_TEMPLATE_SAVED_OBJECT_TYPE, id: 'x' },
      ]);
      expect(result).toEqual(source);
    });

    it('does not mutate the input source object', () => {
      const source = { type: RULE_TEMPLATE_SOURCE_TYPE, data: { template_id: 'old' } };
      const result = injectSourceReferences(source, [
        { name: 'source:template_id', type: RULE_TEMPLATE_SAVED_OBJECT_TYPE, id: 'new' },
      ]);
      expect(source.data.template_id).toBe('old');
      expect(result!.data.template_id).toBe('new');
    });
  });
});
