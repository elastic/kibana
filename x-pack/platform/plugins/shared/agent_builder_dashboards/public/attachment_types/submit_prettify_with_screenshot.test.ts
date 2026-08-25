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
import type { FilesStart } from '@kbn/files-plugin/public';
import { PRETTIFY_DASHBOARD_PROMPT } from './canvas_integration/use_register_canvas_action_buttons';
import { captureAppMainScreenshot } from './capture_app_main_screenshot';
import type { IdGenerator } from '.';
import {
  submitPrettifyWithScreenshot,
  submitPrettifyWithScreenshotInConversation,
} from './submit_prettify_with_screenshot';
import { uploadChatImage } from './upload_chat_image';

jest.mock('./capture_app_main_screenshot', () => ({
  captureAppMainScreenshot: jest.fn(),
}));

jest.mock('./upload_chat_image', () => ({
  uploadChatImage: jest.fn(),
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
const uploadChatImageMock = uploadChatImage as jest.MockedFunction<typeof uploadChatImage>;

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

const files = {} as FilesStart;

const capturedPng = {
  mimeType: 'image/png' as const,
  blob: new Blob([new Uint8Array([1])], { type: 'image/png' }),
  name: 'dashboard-screenshot.png',
};

const uploadedPng = {
  file_id: 'file-png',
  name: 'dashboard-screenshot.png',
  mime_type: 'image/png' as const,
};

describe('submitPrettifyWithScreenshot', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    captureAppMainScreenshotMock.mockReset();
    uploadChatImageMock.mockReset();
    uploadChatImageMock.mockResolvedValue(uploadedPng);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('opens chat with dashboard + Files-backed screenshot attachments and sends Prettify', async () => {
    captureAppMainScreenshotMock.mockResolvedValue({
      mimeType: 'image/jpeg',
      blob: new Blob([new Uint8Array([2])], { type: 'image/jpeg' }),
      name: 'dashboard-screenshot.jpg',
    });
    uploadChatImageMock.mockResolvedValue({
      file_id: 'file-jpg',
      name: 'dashboard-screenshot.jpg',
      mime_type: 'image/jpeg',
    });
    const agentBuilder = createAgentBuilder();
    const dashboard = createDashboard({ dashboardApi: createDashboardApi() });

    await submitPrettifyWithScreenshot({
      agentBuilder,
      dashboard,
      draftAttachmentId: createDraftAttachmentId(),
      files,
    });
    jest.runAllTimers();

    const expectedScreenshot = {
      type: AttachmentType.image,
      description: 'Dashboard screenshot',
      data: {
        file_id: 'file-jpg',
        name: 'dashboard-screenshot.jpg',
        mime_type: 'image/jpeg',
      },
    };
    const expectedDashboard = {
      id: 'draft-dashboard-id',
      origin: 'dash-1',
      type: DASHBOARD_ATTACHMENT_TYPE,
      data: { title: 'My Dashboard', panels: [] },
    };

    expect(agentBuilder.openChat).toHaveBeenCalledWith({
      attachments: [expectedDashboard, expectedScreenshot],
    });
    expect(agentBuilder.addAttachment).toHaveBeenCalledWith(expectedDashboard);
    expect(agentBuilder.addAttachment).toHaveBeenCalledWith(expectedScreenshot);
    expect(agentBuilder.submitMessage).toHaveBeenCalledWith(PRETTIFY_DASHBOARD_PROMPT);
  });

  it('skips dashboard attachment when the current dashboard is already attached', async () => {
    captureAppMainScreenshotMock.mockResolvedValue(capturedPng);
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
      files,
    });

    expect(agentBuilder.openChat).toHaveBeenCalledWith({
      attachments: [
        {
          type: AttachmentType.image,
          description: 'Dashboard screenshot',
          data: uploadedPng,
        },
      ],
    });
    expect(agentBuilder.addAttachment).toHaveBeenCalledTimes(1);
  });

  it('still opens chat and sends Prettify when capture fails and no dashboard api is available', async () => {
    captureAppMainScreenshotMock.mockResolvedValue(undefined);
    const agentBuilder = createAgentBuilder();
    const dashboard = createDashboard({ dashboardApi: undefined });

    await submitPrettifyWithScreenshot({
      agentBuilder,
      dashboard,
      draftAttachmentId: createDraftAttachmentId(),
      files,
    });
    jest.runAllTimers();

    expect(agentBuilder.openChat).toHaveBeenCalledWith({});
    expect(agentBuilder.addAttachment).not.toHaveBeenCalled();
    expect(uploadChatImageMock).not.toHaveBeenCalled();
    expect(agentBuilder.submitMessage).toHaveBeenCalledWith(PRETTIFY_DASHBOARD_PROMPT);
  });
});

describe('submitPrettifyWithScreenshotInConversation', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    captureAppMainScreenshotMock.mockReset();
    uploadChatImageMock.mockReset();
    uploadChatImageMock.mockResolvedValue(uploadedPng);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('uploads the screenshot as a Files attachment and submits the prompt', async () => {
    captureAppMainScreenshotMock.mockResolvedValue(capturedPng);
    const addAttachment = jest.fn();
    const submitMessage = jest.fn();

    await submitPrettifyWithScreenshotInConversation({ addAttachment, submitMessage, files });
    jest.runAllTimers();

    expect(uploadChatImageMock).toHaveBeenCalledWith({
      files,
      blob: capturedPng.blob,
      name: capturedPng.name,
      mimeType: capturedPng.mimeType,
    });
    expect(addAttachment).toHaveBeenCalledWith({
      type: AttachmentType.image,
      description: 'Dashboard screenshot',
      data: uploadedPng,
    });
    expect(submitMessage).toHaveBeenCalledWith(PRETTIFY_DASHBOARD_PROMPT);
  });
});
