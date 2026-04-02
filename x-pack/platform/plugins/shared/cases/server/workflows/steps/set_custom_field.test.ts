/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createCaseResponseFixture } from '../../../common/fixtures/create_case';
import { setCustomFieldStepDefinition } from './set_custom_field';
import type { CasesClient } from '../../client';
import { createStepHandlerContext } from './test_utils';

const createContext = (input: unknown, config: Record<string, unknown> = {}) =>
  createStepHandlerContext({ input, config, stepType: 'cases.setCustomField' });

describe('setCustomFieldStepDefinition', () => {
  const input = {
    case_id: 'case-1',
    field_name: 'first_key',
    value: 'updated value',
  };

  it('creates expected step definition structure', () => {
    const getCasesClient = jest.fn();
    const definition = setCustomFieldStepDefinition(getCasesClient);

    expect(definition.id).toBe('cases.setCustomField');
    expect(typeof definition.handler).toBe('function');
    expect(definition.inputSchema.safeParse(input).success).toBe(true);
  });

  it('replaces the custom field and returns the updated case', async () => {
    const updatedCase = {
      ...createCaseResponseFixture,
      customFields: [{ key: 'first_key', type: 'text' as const, value: 'updated value' }],
    };
    const get = jest
      .fn()
      .mockResolvedValueOnce(createCaseResponseFixture)
      .mockResolvedValueOnce(updatedCase);
    const replaceCustomField = jest.fn().mockResolvedValue({
      key: 'first_key',
      type: 'text' as const,
      value: 'updated value',
    });
    const getCasesClient = jest.fn().mockResolvedValue({
      cases: { get, replaceCustomField },
    } as unknown as CasesClient);
    const definition = setCustomFieldStepDefinition(getCasesClient);

    const result = await definition.handler(createContext(input));

    expect(get).toHaveBeenNthCalledWith(1, { id: 'case-1', includeComments: false });
    expect(replaceCustomField).toHaveBeenCalledWith({
      caseId: 'case-1',
      customFieldId: 'first_key',
      request: {
        caseVersion: createCaseResponseFixture.version,
        value: 'updated value',
      },
    });
    expect(get).toHaveBeenNthCalledWith(2, { id: 'case-1', includeComments: false });
    expect(result).toEqual({
      output: {
        case: updatedCase,
      },
    });
  });

  it('uses provided version without pre-update fetch', async () => {
    const updatedCase = {
      ...createCaseResponseFixture,
      customFields: [{ key: 'first_key', type: 'text' as const, value: 'updated value' }],
    };
    const get = jest.fn().mockResolvedValue(updatedCase);
    const replaceCustomField = jest.fn().mockResolvedValue({
      key: 'first_key',
      type: 'text' as const,
      value: 'updated value',
    });
    const getCasesClient = jest.fn().mockResolvedValue({
      cases: { get, replaceCustomField },
    } as unknown as CasesClient);
    const definition = setCustomFieldStepDefinition(getCasesClient);

    const result = await definition.handler(
      createContext({
        ...input,
        version: 'provided-version',
      })
    );

    expect(replaceCustomField).toHaveBeenCalledWith({
      caseId: 'case-1',
      customFieldId: 'first_key',
      request: {
        caseVersion: 'provided-version',
        value: 'updated value',
      },
    });
    expect(get).toHaveBeenCalledTimes(1);
    expect(get).toHaveBeenCalledWith({ id: 'case-1', includeComments: false });
    expect(result).toEqual({
      output: {
        case: updatedCase,
      },
    });
  });

  it('pushes case when push-case is enabled', async () => {
    const get = jest.fn().mockResolvedValue(createCaseResponseFixture);
    const replaceCustomField = jest.fn().mockResolvedValue({
      key: 'first_key',
      type: 'text' as const,
      value: 'updated value',
    });
    const push = jest.fn().mockResolvedValue(undefined);
    const getCasesClient = jest.fn().mockResolvedValue({
      cases: { get, replaceCustomField, push },
    } as unknown as CasesClient);
    const definition = setCustomFieldStepDefinition(getCasesClient);

    await definition.handler(createContext(input, { 'push-case': true }));

    expect(push).toHaveBeenCalledWith({
      caseId: createCaseResponseFixture.id,
      connectorId: createCaseResponseFixture.connector.id,
      pushType: 'automatic',
    });
  });

  it('returns translated error when replace custom field throws', async () => {
    const get = jest.fn().mockResolvedValue(createCaseResponseFixture);
    const replaceCustomField = jest.fn().mockRejectedValue(new Error('replace failed'));
    const getCasesClient = jest.fn().mockResolvedValue({
      cases: { get, replaceCustomField },
    } as unknown as CasesClient);
    const definition = setCustomFieldStepDefinition(getCasesClient);

    const result = await definition.handler(createContext(input));

    expect(result.error).toEqual(
      expect.objectContaining({
        message: 'Custom field "first_key" on case "case-1" could not be updated.',
      })
    );
  });
});
