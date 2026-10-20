/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createCaseResponseFixture } from '../../../common/fixtures/create_case';
import { CasesStepSingleCaseOutputSchema } from '../../../common/workflows/steps/shared';
import { UnifiedAttachmentTypeRegistry } from '../../attachment_framework/unified_attachment_registry';
import { registerInternalAttachments } from '../../internal_attachments';
import { addAttachmentsStepDefinition } from './add_attachments';
import { createStepHandlerContext } from './test_utils';
import type { CasesClient } from '../../client';

const createContext = (input: unknown, config: Record<string, unknown> = {}) =>
  createStepHandlerContext({ input, config, stepType: 'cases.addAttachments' });

const buildRegistry = () => {
  const registry = new UnifiedAttachmentTypeRegistry();
  registerInternalAttachments(registry);
  return registry;
};

// A single comment attachment as an author would write it in YAML: `owner` is
// intentionally absent because the step injects it from the target case.
const input = {
  case_id: 'case-1',
  attachments: [{ type: 'comment', data: { content: 'Investigating now' } }],
};

describe('addAttachmentsStepDefinition', () => {
  it('returns undefined when no authorable attachment type is registered', () => {
    const getCasesClient = jest.fn();
    expect(
      addAttachmentsStepDefinition(new UnifiedAttachmentTypeRegistry(), getCasesClient)
    ).toBeUndefined();
  });

  it('creates the expected step definition structure', () => {
    const getCasesClient = jest.fn();
    const definition = addAttachmentsStepDefinition(buildRegistry(), getCasesClient)!;

    expect(definition.id).toBe('cases.addAttachments');
    expect(typeof definition.handler).toBe('function');
    expect(definition.inputSchema.safeParse(input).success).toBe(true);
  });

  it('injects owner from the target case into every attachment on bulkCreate', async () => {
    const get = jest.fn().mockResolvedValue(createCaseResponseFixture);
    const bulkCreate = jest.fn().mockResolvedValue(createCaseResponseFixture);
    const getCasesClient = jest.fn().mockResolvedValue({
      cases: { get },
      attachments: { bulkCreate },
    } as unknown as CasesClient);
    const definition = addAttachmentsStepDefinition(buildRegistry(), getCasesClient)!;

    await definition.handler(createContext(input));

    expect(get).toHaveBeenCalledWith({ id: 'case-1', includeComments: false });
    expect(bulkCreate).toHaveBeenCalledWith({
      caseId: 'case-1',
      attachments: [
        {
          type: 'comment',
          data: { content: 'Investigating now' },
          owner: createCaseResponseFixture.owner,
        },
      ],
    });
  });

  it('overwrites an owner that sneaks into the YAML input with the case owner', async () => {
    const get = jest.fn().mockResolvedValue(createCaseResponseFixture);
    const bulkCreate = jest.fn().mockResolvedValue(createCaseResponseFixture);
    const getCasesClient = jest.fn().mockResolvedValue({
      cases: { get },
      attachments: { bulkCreate },
    } as unknown as CasesClient);
    const definition = addAttachmentsStepDefinition(buildRegistry(), getCasesClient)!;

    await definition.handler(
      createContext({
        case_id: 'case-1',
        attachments: [{ type: 'comment', data: { content: 'x' }, owner: 'spoofed-owner' }],
      })
    );

    const [{ attachments }] = bulkCreate.mock.calls[0];
    expect(attachments[0].owner).toBe(createCaseResponseFixture.owner);
    expect(attachments[0].owner).not.toBe('spoofed-owner');
  });

  it('returns an output the single-case output schema accepts', async () => {
    const get = jest.fn().mockResolvedValue(createCaseResponseFixture);
    const bulkCreate = jest.fn().mockResolvedValue(createCaseResponseFixture);
    const getCasesClient = jest.fn().mockResolvedValue({
      cases: { get },
      attachments: { bulkCreate },
    } as unknown as CasesClient);
    const definition = addAttachmentsStepDefinition(buildRegistry(), getCasesClient)!;

    const result = await definition.handler(createContext(input));

    expect(
      CasesStepSingleCaseOutputSchema.safeParse((result as { output: unknown }).output).success
    ).toBe(true);
  });

  it('returns the error when bulkCreate throws', async () => {
    const bulkCreateError = new Error('bulk create failed');
    const get = jest.fn().mockResolvedValue(createCaseResponseFixture);
    const bulkCreate = jest.fn().mockRejectedValue(bulkCreateError);
    const getCasesClient = jest.fn().mockResolvedValue({
      cases: { get },
      attachments: { bulkCreate },
    } as unknown as CasesClient);
    const definition = addAttachmentsStepDefinition(buildRegistry(), getCasesClient)!;

    const result = await definition.handler(createContext(input));

    expect(result).toEqual({ error: bulkCreateError });
  });

  it('pushes the case when push-case is enabled', async () => {
    const get = jest.fn().mockResolvedValue(createCaseResponseFixture);
    const bulkCreate = jest.fn().mockResolvedValue(createCaseResponseFixture);
    const push = jest.fn().mockResolvedValue(undefined);
    const getCasesClient = jest.fn().mockResolvedValue({
      cases: { get, push },
      attachments: { bulkCreate },
    } as unknown as CasesClient);
    const definition = addAttachmentsStepDefinition(buildRegistry(), getCasesClient)!;

    await definition.handler(createContext(input, { 'push-case': true }));

    expect(push).toHaveBeenCalledWith({
      caseId: createCaseResponseFixture.id,
      connectorId: createCaseResponseFixture.connector.id,
      pushType: 'automatic',
    });
  });
});
