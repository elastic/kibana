/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import type { DashboardStart } from '@kbn/dashboard-plugin/public';
import { PRETTIFY_DASHBOARD_PROMPT } from './canvas_integration/use_register_canvas_action_buttons';
import { registerPrettifyAppMenuItem } from './register_prettify_app_menu_item';
import { submitPrettifyWithScreenshot } from './submit_prettify_with_screenshot';

jest.mock('./submit_prettify_with_screenshot', () => ({
  submitPrettifyWithScreenshot: jest.fn().mockResolvedValue(undefined),
}));

const submitPrettifyWithScreenshotMock = submitPrettifyWithScreenshot as jest.MockedFunction<
  typeof submitPrettifyWithScreenshot
>;

describe('registerPrettifyAppMenuItem', () => {
  beforeEach(() => {
    submitPrettifyWithScreenshotMock.mockClear();
  });

  it('registers an edit-mode Prettify item before Exit edit and submits with screenshot', () => {
    let generator: Parameters<DashboardStart['registerAppMenuItemGenerator']>[0] | undefined;
    const unregister = jest.fn();
    const dashboard = {
      registerAppMenuItemGenerator: jest.fn((g) => {
        generator = g;
        return unregister;
      }),
    } as unknown as DashboardStart;
    const agentBuilder = {
      openChat: jest.fn(),
      submitMessage: jest.fn(),
    } as unknown as AgentBuilderPluginStart;

    const draftAttachmentId = { current: 'draft-id', next: jest.fn() };
    const files = {} as import('@kbn/files-plugin/public').FilesStart;
    const cleanup = registerPrettifyAppMenuItem({
      dashboard,
      agentBuilder,
      draftAttachmentId,
      files,
    });

    expect(generator?.({ viewMode: 'view' })).toBeUndefined();

    const item = generator?.({ viewMode: 'edit' });
    expect(item).toEqual(
      expect.objectContaining({
        id: 'agentBuilderPrettify',
        order: 0,
        label: 'Prettify',
        testId: 'dashboardAgentBuilderPrettifyButton',
      })
    );

    item?.run?.();
    expect(submitPrettifyWithScreenshotMock).toHaveBeenCalledWith({
      agentBuilder,
      dashboard,
      draftAttachmentId,
      files,
    });
    // prompt constant still exported for consumers
    expect(PRETTIFY_DASHBOARD_PROMPT).toBe('Prettify this dashboard');

    cleanup();
    expect(unregister).toHaveBeenCalled();
  });
});
