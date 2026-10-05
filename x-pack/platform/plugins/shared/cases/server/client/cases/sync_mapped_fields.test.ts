/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Case } from '../../../common/types/domain';
import { UserActionTypes } from '../../../common/types/domain';
import { mockCases } from '../../mocks';
import { flattenCaseSavedObject } from '../../common/utils';
import { createCasesClientMockArgs } from '../mocks';
import { buildMappedFieldsPatch, mappingsKeepKibanaValue } from './sync_mapped_fields';

const theCase: Case = {
  ...flattenCaseSavedObject({ savedObject: mockCases[0] }),
  extended_fields: { severity_tier_as_keyword: 'Low' },
};

const definitions = [
  {
    fieldDefinitionId: 'fd-1',
    name: 'severity_tier',
    owner: theCase.owner,
    isGlobal: true,
    definition: 'name: severity_tier\ncontrol: INPUT_TEXT\ntype: keyword\nlabel: Severity tier\n',
  },
  {
    fieldDefinitionId: 'fd-2',
    name: 'region',
    owner: theCase.owner,
    isGlobal: true,
    definition:
      'name: region\ncontrol: SELECT_BASIC\ntype: keyword\nmetadata:\n  options:\n    - EMEA\n    - AMER\n',
  },
];

describe('sync_mapped_fields', () => {
  const clientArgs = createCasesClientMockArgs();

  beforeEach(() => {
    jest.clearAllMocks();
    clientArgs.services.fieldDefinitionsService.getFieldDefinitions.mockResolvedValue({
      fieldDefinitions: definitions,
      total: definitions.length,
    } as never);
  });

  describe('mappingsKeepKibanaValue', () => {
    it('is true only when a pulled mapping resolves to the kibana strategy', () => {
      expect(mappingsKeepKibanaValue(undefined, 'external')).toBe(false);
      expect(
        mappingsKeepKibanaValue(
          [{ externalField: 'a', caseField: 'b', direction: 'push' }],
          'kibana'
        )
      ).toBe(false);
      expect(
        mappingsKeepKibanaValue(
          [{ externalField: 'a', caseField: 'b', direction: 'pull' }],
          'kibana'
        )
      ).toBe(true);
      expect(
        mappingsKeepKibanaValue(
          [{ externalField: 'a', caseField: 'b', direction: 'both', conflictStrategy: 'kibana' }],
          'external'
        )
      ).toBe(true);
    });
  });

  describe('buildMappedFieldsPatch', () => {
    it('returns nothing when no mapping pulls', async () => {
      const res = await buildMappedFieldsPatch({
        theCase,
        incident: { priority: { name: 'High' } },
        mappings: [
          { externalField: 'priority', caseField: 'severity_tier_as_keyword', direction: 'push' },
        ],
        defaultStrategy: 'external',
        changedInKibana: new Set(),
        clientArgs,
      });

      expect(res).toEqual({ extendedFields: {}, updatedFields: [], conflictedFields: [] });
      expect(
        clientArgs.services.fieldDefinitionsService.getFieldDefinitions
      ).not.toHaveBeenCalled();
    });

    it('writes the coerced external value onto the mapped global field', async () => {
      const res = await buildMappedFieldsPatch({
        theCase,
        incident: { priority: { name: 'High' } },
        mappings: [
          { externalField: 'priority', caseField: 'severity_tier_as_keyword', direction: 'both' },
        ],
        defaultStrategy: 'external',
        changedInKibana: new Set(),
        clientArgs,
      });

      expect(res).toEqual({
        extendedFields: { severity_tier_as_keyword: 'High' },
        updatedFields: ['severity_tier_as_keyword'],
        conflictedFields: [],
      });
    });

    it('skips unchanged, missing and unknown-field values', async () => {
      const res = await buildMappedFieldsPatch({
        theCase,
        incident: { priority: { name: 'Low' }, unknown: 'x' },
        mappings: [
          { externalField: 'priority', caseField: 'severity_tier_as_keyword', direction: 'pull' },
          { externalField: 'absent', caseField: 'severity_tier_as_keyword', direction: 'pull' },
          { externalField: 'unknown', caseField: 'deleted_as_keyword', direction: 'pull' },
        ],
        defaultStrategy: 'external',
        changedInKibana: new Set(),
        clientArgs,
      });

      expect(res).toEqual({ extendedFields: {}, updatedFields: [], conflictedFields: [] });
    });

    it('skips and logs a value the target field rejects', async () => {
      const res = await buildMappedFieldsPatch({
        theCase,
        incident: { region: 'APAC' },
        mappings: [{ externalField: 'region', caseField: 'region_as_keyword', direction: 'pull' }],
        defaultStrategy: 'external',
        changedInKibana: new Set(),
        clientArgs,
      });

      expect(res.extendedFields).toEqual({});
      expect(clientArgs.logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Skipping external field region')
      );
    });

    it('reports a conflict instead of overwriting when Kibana edited extended fields', async () => {
      const res = await buildMappedFieldsPatch({
        theCase,
        incident: { priority: 'High' },
        mappings: [
          {
            externalField: 'priority',
            caseField: 'severity_tier_as_keyword',
            direction: 'pull',
            conflictStrategy: 'kibana',
          },
        ],
        defaultStrategy: 'external',
        changedInKibana: new Set([UserActionTypes.extended_fields]),
        clientArgs,
      });

      expect(res).toEqual({
        extendedFields: {},
        updatedFields: [],
        conflictedFields: ['severity_tier_as_keyword'],
      });
    });
  });
});
