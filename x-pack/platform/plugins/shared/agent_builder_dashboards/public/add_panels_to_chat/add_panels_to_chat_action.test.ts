/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DASHBOARD_ATTACHMENT_TYPE } from '@kbn/agent-builder-dashboards-common';
import type { DashboardApi } from '@kbn/dashboard-plugin/public';
import { ADD_PANELS_TO_CHAT_ACTION_ID } from '@kbn/dashboard-plugin/public';
import { createAddPanelsToChatAction } from './add_panels_to_chat_action';

const markdownPanel = (id: string) => ({
  type: 'DASHBOARD_MARKDOWN',
  id,
  grid: { x: 0, y: 0, w: 24, h: 15 },
  config: { content: `panel ${id}` },
});

const dashboardApi = {
  getSerializedState: () => ({
    attributes: {
      title: 'Web traffic',
      panels: [
        markdownPanel('a'),
        markdownPanel('b'),
        {
          id: 'section1',
          title: 'Section',
          collapsed: false,
          grid: { y: 20 },
          panels: [markdownPanel('c'), markdownPanel('d')],
        },
      ],
    },
  }),
} as unknown as DashboardApi;

const trigger = { id: ADD_PANELS_TO_CHAT_ACTION_ID };

const setup = (hasRequiredLicense = true) => {
  const openChat = jest.fn();
  const action = createAddPanelsToChatAction({
    openChat,
    getAgentBuilderAccess: jest
      .fn()
      .mockResolvedValue({ hasRequiredLicense, hasLlmConnector: true }),
  });
  return { action, openChat };
};

describe('add panels to chat action', () => {
  it('is compatible only with a selection and the required license', async () => {
    expect(await setup().action.isCompatible!({ dashboardApi, panelIds: ['a'], trigger })).toBe(
      true
    );
    expect(await setup().action.isCompatible!({ dashboardApi, panelIds: [], trigger })).toBe(false);
    expect(
      await setup(false).action.isCompatible!({ dashboardApi, panelIds: ['a'], trigger })
    ).toBe(false);
  });

  it('attaches only the selected panels, lifting them out of sections', async () => {
    const { action, openChat } = setup();
    await action.execute({ dashboardApi, panelIds: ['b', 'c'], trigger });

    expect(openChat).toHaveBeenCalledTimes(1);
    const [{ attachments, sessionTag }] = openChat.mock.calls[0];
    expect(sessionTag).toBe('dashboard');
    expect(attachments).toHaveLength(1);

    const [attachment] = attachments;
    expect(attachment.type).toBe(DASHBOARD_ATTACHMENT_TYPE);
    // a subset of the dashboard must not be linked to the dashboard saved object
    expect(attachment.origin).toBeUndefined();
    expect(attachment.description).toBe('2 panels from dashboard "Web traffic"');
    expect(attachment.data.panels.map((panel: { id: string }) => panel.id)).toEqual(['b', 'c']);
  });

  it('does not open the chat when none of the ids match a panel', async () => {
    const { action, openChat } = setup();
    await action.execute({ dashboardApi, panelIds: ['missing'], trigger });
    expect(openChat).not.toHaveBeenCalled();
  });
});
