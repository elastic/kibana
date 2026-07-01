/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UnifiedAttachmentTypeRegistry } from '../attachment_framework/unified_attachment_registry';
import { registerCaseWorkflowSteps } from '.';

describe('registerCaseWorkflowSteps', () => {
  const registerWithFlag = (
    isCasesAttachmentsEnabled: boolean,
    registry: UnifiedAttachmentTypeRegistry = new UnifiedAttachmentTypeRegistry()
  ) => {
    const workflowsExtensions = { registerStepDefinition: jest.fn() };
    const getCasesClient = jest.fn();

    registerCaseWorkflowSteps(
      workflowsExtensions as never,
      getCasesClient as never,
      registry,
      isCasesAttachmentsEnabled
    );

    return workflowsExtensions.registerStepDefinition;
  };

  // The attachment registry is populated by solutions' `setup` (which runs
  // after cases's), so we can't rely on any authorable type being present here.
  // Registration is therefore deferred to an async loader that resolves to
  // `undefined` when the registry is empty at load-time — meaning the flag
  // alone controls whether the +1 loader is enqueued.
  it('registers the generic attachments step loader only when unified attachments are enabled', () => {
    const disabled = registerWithFlag(false);
    const enabled = registerWithFlag(true);

    expect(enabled).toHaveBeenCalledTimes(disabled.mock.calls.length + 1);
  });
});
