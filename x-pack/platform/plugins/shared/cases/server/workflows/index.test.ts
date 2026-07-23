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
    const waitForStartServices = jest.fn(() => Promise.resolve());

    registerCaseWorkflowSteps(
      workflowsExtensions as never,
      getCasesClient as never,
      registry,
      isCasesAttachmentsEnabled,
      waitForStartServices
    );

    return { register: workflowsExtensions.registerStepDefinition, waitForStartServices };
  };

  // The attachment registry is populated by solutions' `setup` (which runs
  // after cases's), so we can't rely on any authorable type being present here.
  // Registration is therefore deferred to an async loader that resolves to
  // `undefined` when the registry is empty at load-time — meaning the flag
  // alone controls whether the +1 loader is enqueued.
  it('registers the generic attachments step loader only when unified attachments are enabled', () => {
    const disabled = registerWithFlag(false).register;
    const enabled = registerWithFlag(true).register;

    expect(enabled).toHaveBeenCalledTimes(disabled.mock.calls.length + 1);
  });

  // The bug the wait guard fixes: without it the loader's `.then` fires on the
  // microtask queue while core is still awaiting the next plugin's `init`,
  // snapshotting the attachment registry before solutions have registered.
  // Awaiting `waitForStartServices` inside the loader defers composition until
  // every setup has completed.
  it('awaits start services inside the attachments-step loader before composing the schema', async () => {
    const registry = new UnifiedAttachmentTypeRegistry();
    const { register, waitForStartServices } = registerWithFlag(true, registry);

    const loaderCall = register.mock.calls.find(([arg]) => typeof arg === 'function');
    expect(loaderCall).toBeDefined();
    const loader = loaderCall![0] as () => Promise<unknown>;

    const startServicesResolvers: Array<() => void> = [];
    waitForStartServices.mockImplementationOnce(
      () => new Promise<void>((resolve) => startServicesResolvers.push(resolve))
    );

    const loaderPromise = loader();
    expect(waitForStartServices).toHaveBeenCalledTimes(1);

    // Registry is empty in this test → the step should resolve to `undefined`
    // (a silently-skipped registration), but only after start services resolves.
    startServicesResolvers[0]();
    await expect(loaderPromise).resolves.toBeUndefined();
  });
});
