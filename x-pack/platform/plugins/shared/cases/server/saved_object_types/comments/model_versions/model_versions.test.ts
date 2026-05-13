/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { modelVersion1 } from './model_version_1';
import { modelVersion2 } from './model_version_2';

describe('cases-comments model versions', () => {
  describe('version 1', () => {
    it('still adds the eventId mapping (regression)', () => {
      expect(modelVersion1.changes).toEqual([
        {
          type: 'mappings_addition',
          addedMappings: {
            eventId: { type: 'keyword' },
          },
        },
      ]);
    });
  });

  describe('version 2', () => {
    it('adds a scripted caseId keyword mapping derived from references and ships no data_backfill', () => {
      expect(modelVersion2.changes).toHaveLength(1);

      const [change] = modelVersion2.changes;
      expect(change.type).toBe('mappings_addition');

      if (change.type !== 'mappings_addition') {
        throw new Error('expected mappings_addition change');
      }

      expect(change.addedMappings).toEqual({
        caseId: {
          type: 'keyword',
          on_script_error: 'continue',
          script: { source: expect.stringContaining('references') },
        },
      });

      const caseIdMapping = change.addedMappings.caseId as {
        script: { source: string };
      };
      expect(caseIdMapping.script.source).toContain("'cases'");
      expect(caseIdMapping.script.source).toContain('emit');
    });
  });
});
