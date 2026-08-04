/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import { AttachmentType } from '@kbn/agent-builder-common/attachments';
import { DASHBOARD_ATTACHMENT_TYPE } from '@kbn/agent-builder-dashboards-common';
import type { DashboardApi, DashboardStart } from '@kbn/dashboard-plugin/public';
import { CAPTURE_DASHBOARD_SCREENSHOT_TOOL_ID } from '../browser_tools/capture_dashboard_screenshot';
import { PRETTIFY_DASHBOARD_PROMPT } from './canvas_integration/use_register_canvas_action_buttons';
import { captureAppMainScreenshot } from './capture_app_main_screenshot';
import type { IdGenerator } from '.';
import {
  submitPrettifyWithScreenshot,
  submitPrettifyWithScreenshotInConversation,
} from './submit_prettify_with_screenshot';

jest.mock('./capture_app_main_screenshot', () => ({
  captureAppMainScreenshot: jest.fn(),
}));

jest.mock('@kbn/agent-builder-dashboards-common', () => {
  const actual = jest.requireActual('@kbn/agent-builder-dashboards-common');
  return {
    ...actual,
    dashboardStateToAttachmentData: jest.fn(() => ({
      title: 'My Dashboard',
      panels: [],
    })),
  };
});

const captureAppMainScreenshotMock = captureAppMainScreenshot as jest.MockedFunction<
  typeof captureAppMainScreenshot
>;

const createDraftAttachmentId = (id = 'draft-dashboard-id'): IdGenerator => ({
  current: id,
  next: jest.fn(),
});

const createDashboard = ({
  dashboardApi,
}: {
  dashboardApi?: DashboardApi;
} = {}): DashboardStart => {
  return {
    dashboardAppClientApi$: new BehaviorSubject(dashboardApi),
  } as unknown as DashboardStart;
};

const createDashboardApi = ({
  savedObjectId = 'dash-1',
}: {
  savedObjectId?: string | undefined;
} = {}): DashboardApi => {
  return {
    savedObjectId$: new BehaviorSubject(savedObjectId),
    getSerializedState: jest.fn().mockReturnValue({
      attributes: { title: 'My Dashboard', panels: [] },
    }),
  } as unknown as DashboardApi;
};

const createAgentBuilder = ({
  activeConversation = null,
}: {
  activeConversation?: unknown;
} = {}): AgentBuilderPluginStart => {
  return {
    openChat: jest.fn(),
    addAttachment: jest.fn(),
    submitMessage: jest.fn(),
    events: {
      ui: {
        activeConversation$: new BehaviorSubject(activeConversation),
      },
    },
  } as unknown as AgentBuilderPluginStart;
};

describe('submitPrettifyWithScreenshot', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    captureAppMainScreenshotMock.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('opens chat with dashboard + screenshot attachments and the capture browser tool', async () => {
    captureAppMainScreenshotMock.mockResolvedValue({
      media_type: 'image/jpeg',
      data: 'abc',
    });
    const agentBuilder = createAgentBuilder();
    const dashboard = createDashboard({ dashboardApi: createDashboardApi() });

    await submitPrettifyWithScreenshot({
      agentBuilder,
      dashboard,
      draftAttachmentId: createDraftAttachmentId(),
    });

    const expectedScreenshot = {
      type: AttachmentType.image,
      description: 'Dashboard screenshot',
      data: { media_type: 'image/jpeg', data: 'abc' },
    };
    const expectedDashboard = {
      id: 'draft-dashboard-id',
      origin: 'dash-1',
      type: DASHBOARD_ATTACHMENT_TYPE,
      data: { title: 'My Dashboard', panels: [] },
    };

    expect(agentBuilder.openChat).toHaveBeenCalledWith({
      attachments: [expectedDashboard, expectedScreenshot],
      browserApiTools: [
        expect.objectContaining({ id: CAPTURE_DASHBOARD_SCREENSHOT_TOOL_ID, returnsResult: true }),
      ],
    });
    expect(agentBuilder.addAttachment).toHaveBeenCalledWith(expectedDashboard);
    expect(agentBuilder.addAttachment).toHaveBeenCalledWith(expectedScreenshot);
  });

  it('skips dashboard attachment when the current dashboard is already attached', async () => {
    captureAppMainScreenshotMock.mockResolvedValue({
      media_type: 'image/png',
      data: 'xyz',
    });
    const agentBuilder = createAgentBuilder({
      activeConversation: {
        id: 'conv-1',
        conversation: {
          attachments: [
            {
              id: 'existing-dash',
              type: DASHBOARD_ATTACHMENT_TYPE,
              origin: 'dash-1',
              current_version: 1,
              active: true,
              versions: [
                {
                  version: 1,
                  data: { title: 'Existing', panels: [] },
                  created_at: '2024-01-01T00:00:00.000Z',
                  content_hash: 'hash',
                },
              ],
            },
          ],
        },
      },
    });
    const dashboard = createDashboard({ dashboardApi: createDashboardApi() });

    await submitPrettifyWithScreenshot({
      agentBuilder,
      dashboard,
      draftAttachmentId: createDraftAttachmentId(),
    });

    expect(agentBuilder.openChat).toHaveBeenCalledWith({
      attachments: [
        {
          type: AttachmentType.image,
          description: 'Dashboard screenshot',
          data: { media_type: 'image/png', data: 'xyz' },
        },
      ],
      browserApiTools: [
        expect.objectContaining({ id: CAPTURE_DASHBOARD_SCREENSHOT_TOOL_ID, returnsResult: true }),
      ],
    });
    expect(agentBuilder.addAttachment).toHaveBeenCalledTimes(1);
  });

  it('still opens chat with the capture tool when capture fails and no dashboard api is available', async () => {
    captureAppMainScreenshotMock.mockResolvedValue(undefined);
    const agentBuilder = createAgentBuilder();
    const dashboard = createDashboard({ dashboardApi: undefined });

    await submitPrettifyWithScreenshot({
      agentBuilder,
      dashboard,
      draftAttachmentId: createDraftAttachmentId(),
    });

    expect(agentBuilder.openChat).toHaveBeenCalledWith({
      browserApiTools: [
        expect.objectContaining({ id: CAPTURE_DASHBOARD_SCREENSHOT_TOOL_ID, returnsResult: true }),
      ],
    });
    expect(agentBuilder.addAttachment).not.toHaveBeenCalled();
  });
});

describe('submitPrettifyWithScreenshotInConversation', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    captureAppMainScreenshotMock.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('adds screenshot and submits the prompt', async () => {
    captureAppMainScreenshotMock.mockResolvedValue({
      media_type: 'image/webp',
      data: 'shot',
    });
    const addAttachment = jest.fn();
    const submitMessage = jest.fn();

    await submitPrettifyWithScreenshotInConversation({ addAttachment, submitMessage });
    jest.runAllTimers();

    expect(addAttachment).toHaveBeenCalledWith({
      type: AttachmentType.image,
      description: 'Dashboard screenshot',
      data: { media_type: 'image/webp', data: 'shot' },
    });
    expect(submitMessage).toHaveBeenCalledWith(PRETTIFY_DASHBOARD_PROMPT);
  });
});
