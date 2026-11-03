/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AppStatus } from '@kbn/core/public';
import { callContext, createDeps } from './test_helpers.mock';
import { createNavigateToTool } from './navigate_to';

const setup = () => {
  const deps = createDeps([
    { id: 'discover', title: 'Discover', status: AppStatus.accessible },
    { id: 'locked', title: 'Locked', status: AppStatus.inaccessible },
  ]);
  const application = deps.application as any;
  application.navigateToApp = jest.fn().mockResolvedValue(undefined);
  application.navigateToUrl = jest.fn();
  application.getUrlForApp = jest.fn(
    (id: string, { path }: { path?: string }) => `/app/${id}${path ?? ''}`
  );
  return { application, tool: createNavigateToTool(deps) };
};

describe('navigate_to', () => {
  it('throws on an unknown app without navigating', async () => {
    const { application, tool } = setup();
    await expect(tool.handler({ app_id: 'nope' }, callContext())).rejects.toThrow(
      'Unknown or unavailable app "nope"'
    );
    expect(application.navigateToApp).not.toHaveBeenCalled();
  });

  it('throws on an inaccessible app', async () => {
    const { application, tool } = setup();
    await expect(tool.handler({ app_id: 'locked' }, callContext())).rejects.toThrow(
      'Unknown or unavailable app "locked"'
    );
    expect(application.navigateToApp).not.toHaveBeenCalled();
  });

  it('never uses navigateToUrl', async () => {
    const { application, tool } = setup();
    await tool.handler({ app_id: 'discover' }, callContext());
    expect(application.navigateToUrl).not.toHaveBeenCalled();
  });

  it('does nothing when the signal is already aborted', async () => {
    const { application, tool } = setup();
    const controller = new AbortController();
    controller.abort();
    await expect(
      tool.handler({ app_id: 'discover' }, callContext(controller.signal))
    ).rejects.toThrow('aborted');
    expect(application.navigateToApp).not.toHaveBeenCalled();
  });

  it('navigates and returns the url', async () => {
    const { application, tool } = setup();
    const result = await tool.handler({ app_id: 'discover', path: '#/x' }, callContext());
    expect(application.navigateToApp).toHaveBeenCalledWith('discover', { path: '#/x' });
    expect(result).toEqual({ content: { url: '/app/discover#/x' } });
  });

  it('navigates without a path', async () => {
    const { application, tool } = setup();
    const result = await tool.handler({ app_id: 'discover' }, callContext());
    expect(application.navigateToApp).toHaveBeenCalledWith('discover', { path: undefined });
    expect(result).toEqual({ content: { url: '/app/discover' } });
  });
});
