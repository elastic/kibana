/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createCaseResponseFixture } from '../../../common/fixtures/create_case';
import { setExtendedFieldsStepDefinition } from './set_extended_fields';
import type { CasesClient } from '../../client';
import { createStepHandlerContext } from './test_utils';

const createContext = (input: unknown, config: Record<string, unknown> = {}) =>
  createStepHandlerContext({ input, config, stepType: 'cases.setExtendedFields' });

describe('setExtendedFieldsStepDefinition', () => {
  const input = {
    case_id: 'case-1',
    fields: {
      priority_as_keyword: 'high',
      analyst_notes_as_keyword: 'escalated by automation',
    },
  };

  it('creates expected step definition structure', () => {
    const getCasesClient = jest.fn();
    const definition = setExtendedFieldsStepDefinition(getCasesClient);

    expect(definition.id).toBe('cases.setExtendedFields');
    expect(typeof definition.handler).toBe('function');
    expect(definition.inputSchema.safeParse(input).success).toBe(true);
  });

  it('resolves the version, merges the fields via bulkUpdate, and returns the updated case', async () => {
    const updatedCase = {
      ...createCaseResponseFixture,
      extended_fields: input.fields,
    };
    const get = jest.fn().mockResolvedValue(createCaseResponseFixture);
    const bulkUpdate = jest.fn().mockResolvedValue([updatedCase]);
    const getCasesClient = jest.fn().mockResolvedValue({
      cases: { get, bulkUpdate },
    } as unknown as CasesClient);
    const definition = setExtendedFieldsStepDefinition(getCasesClient);

    const result = await definition.handler(createContext(input));

    // No version supplied → the step fetches the current version first.
    expect(get).toHaveBeenCalledWith({ id: 'case-1', includeComments: false });
    expect(bulkUpdate).toHaveBeenCalledWith({
      cases: [
        {
          id: 'case-1',
          version: createCaseResponseFixture.version,
          extended_fields: input.fields,
        },
      ],
    });
    expect(result).toEqual({
      output: {
        case: expect.objectContaining({ id: createCaseResponseFixture.id }),
      },
    });
  });

  it('uses a provided version without a pre-update fetch', async () => {
    const get = jest.fn();
    const bulkUpdate = jest.fn().mockResolvedValue([createCaseResponseFixture]);
    const getCasesClient = jest.fn().mockResolvedValue({
      cases: { get, bulkUpdate },
    } as unknown as CasesClient);
    const definition = setExtendedFieldsStepDefinition(getCasesClient);

    await definition.handler(createContext({ ...input, version: 'provided-version' }));

    expect(get).not.toHaveBeenCalled();
    expect(bulkUpdate).toHaveBeenCalledWith({
      cases: [
        {
          id: 'case-1',
          version: 'provided-version',
          extended_fields: input.fields,
        },
      ],
    });
  });

  it('returns a forbidden error and never calls bulkUpdate when the version-resolving get is unauthorized', async () => {
    const get = jest.fn().mockRejectedValue(new Error('Unauthorized to get case'));
    const bulkUpdate = jest.fn();
    const getCasesClient = jest.fn().mockResolvedValue({
      cases: { get, bulkUpdate },
    } as unknown as CasesClient);
    const definition = setExtendedFieldsStepDefinition(getCasesClient);

    const result = await definition.handler(createContext(input));

    expect(bulkUpdate).not.toHaveBeenCalled();
    expect(result.error).toEqual(
      expect.objectContaining({
        message:
          'Extended fields on case "case-1" could not be updated. Reason: Unauthorized to get case',
      })
    );
  });

  it('surfaces a forbidden bulkUpdate error without applying a partial update', async () => {
    const get = jest.fn().mockResolvedValue(createCaseResponseFixture);
    const bulkUpdate = jest.fn().mockRejectedValue(new Error('Unauthorized to update case'));
    const getCasesClient = jest.fn().mockResolvedValue({
      cases: { get, bulkUpdate },
    } as unknown as CasesClient);
    const definition = setExtendedFieldsStepDefinition(getCasesClient);

    const result = await definition.handler(createContext(input));

    expect(result.error).toEqual(
      expect.objectContaining({
        message:
          'Extended fields on case "case-1" could not be updated. Reason: Unauthorized to update case',
      })
    );
  });

  it('surfaces the underlying validation message when bulkUpdate throws', async () => {
    const get = jest.fn().mockResolvedValue(createCaseResponseFixture);
    const bulkUpdate = jest
      .fn()
      .mockRejectedValue(new Error('Invalid value for extended field "priority_as_keyword"'));
    const getCasesClient = jest.fn().mockResolvedValue({
      cases: { get, bulkUpdate },
    } as unknown as CasesClient);
    const definition = setExtendedFieldsStepDefinition(getCasesClient);

    const result = await definition.handler(createContext(input));

    // The error must NOT be swallowed into a generic message — the offending key is named.
    expect(result.error).toEqual(
      expect.objectContaining({
        message:
          'Extended fields on case "case-1" could not be updated. Reason: Invalid value for extended field "priority_as_keyword"',
      })
    );
  });
});
