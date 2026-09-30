/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApplicationStart, NotificationsStart } from '@kbn/core/public';
import { createActionHandler } from './handle_action';

function deps(runWorkflow?: jest.Mock) {
  const toasts = { addDanger: jest.fn(), addWarning: jest.fn(), addSuccess: jest.fn() };
  const application = { navigateToApp: jest.fn() };
  return {
    handler: createActionHandler({
      application: application as unknown as ApplicationStart,
      notifications: { toasts } as unknown as NotificationsStart,
      runWorkflow,
    }),
    toasts,
    application,
  };
}

const event = (name: string, context: Record<string, unknown> = {}) => ({
  surfaceId: 's1',
  name,
  context: context as never,
});

describe('createActionHandler', () => {
  it('navigates for kbn.navigate', async () => {
    const { handler, application } = deps();
    await handler(event('kbn.navigate', { appId: 'discover', path: '/foo' }));
    expect(application.navigateToApp).toHaveBeenCalledWith('discover', { path: '/foo' });
  });

  it('rejects kbn.navigate without a string appId', async () => {
    const { handler, application, toasts } = deps();
    await handler(event('kbn.navigate', { appId: 42 }));
    expect(application.navigateToApp).not.toHaveBeenCalled();
    expect(toasts.addDanger).toHaveBeenCalled();
  });

  it('passes workflow inputs through, minus the workflowId itself', async () => {
    const runWorkflow = jest.fn().mockResolvedValue(undefined);
    const { handler } = deps(runWorkflow);
    await handler(
      event('kbn.runWorkflow', { workflowId: 'wf-1', service: 'checkout', drain: true })
    );
    expect(runWorkflow).toHaveBeenCalledWith('wf-1', { service: 'checkout', drain: true });
  });

  it('warns instead of throwing when no workflow runner is wired up', async () => {
    const { handler, toasts } = deps();
    await handler(event('kbn.runWorkflow', { workflowId: 'wf-1' }));
    expect(toasts.addWarning).toHaveBeenCalled();
  });

  it('surfaces an unsupported action rather than ignoring it', async () => {
    const { handler, toasts } = deps();
    await handler(event('kbn.deleteEverything'));
    expect(toasts.addDanger).toHaveBeenCalledWith('Unsupported action "kbn.deleteEverything"');
  });
});
