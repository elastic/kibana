/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { UnifiedAttachmentTypeRegistry } from '../client/attachment_framework/unified_attachment_registry';
import { registerCasesSteps } from '.';
import { getAddAttachmentsStepDefinition } from './add_attachments';

const buildRegistryWithComment = () => {
  const registry = new UnifiedAttachmentTypeRegistry();
  registry.register({
    id: 'comment',
    schema: z.object({
      type: z.literal('comment'),
      owner: z.string(),
      data: z.object({ content: z.string() }),
    }),
  } as never);
  return registry;
};

describe('registerCasesSteps', () => {
  const registerWithFlag = (isCasesAttachmentsEnabled: boolean) => {
    const workflowsExtensions = { registerStepDefinition: jest.fn() };

    registerCasesSteps(
      workflowsExtensions as never,
      new UnifiedAttachmentTypeRegistry(),
      isCasesAttachmentsEnabled
    );

    return workflowsExtensions.registerStepDefinition;
  };

  // The attachment registry is populated during `start`, after `registerCasesSteps`
  // runs at `setup`. Registration is therefore deferred to the (lazy) loader, so
  // the +1 loader is always registered when the flag is on regardless of the
  // registry's contents at this point.
  it('registers the generic attachments step loader only when unified attachments are enabled', () => {
    const disabled = registerWithFlag(false);
    const enabled = registerWithFlag(true);

    expect(enabled).toHaveBeenCalledTimes(disabled.mock.calls.length + 1);
  });
});

describe('generic attachments step definition', () => {
  it('builds a definition when an authorable attachment type is registered', () => {
    const registry = buildRegistryWithComment();

    expect(getAddAttachmentsStepDefinition(registry)).toBeDefined();
  });

  it('returns undefined when no authorable attachment type is registered', () => {
    const registry = new UnifiedAttachmentTypeRegistry();

    expect(getAddAttachmentsStepDefinition(registry)).toBeUndefined();
  });
});
