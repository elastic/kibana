/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import type { SharePublicStart } from '@kbn/share-plugin/public/plugin';
import { copyToClipboard } from '@elastic/eui';
import {
  createMockClassicStreamDefinition,
  createMockWiredStreamDefinition,
} from '../shared/mocks/stream_definitions';
import type { StatefulStreamsAppRouter } from '../../../../hooks/use_streams_app_router';
import { buildLifecycleTabActions } from './lifecycle_tab_label_with_actions';

jest.mock('@elastic/eui', () => {
  const actual = jest.requireActual('@elastic/eui');
  return {
    ...actual,
    copyToClipboard: jest.fn(() => true),
  };
});

const mockCopyToClipboard = copyToClipboard as jest.Mock;

const timeRange = { rangeFrom: 'now-15m', rangeTo: 'now' };

const createRouter = () =>
  ({
    push: jest.fn(),
    replace: jest.fn(),
    link: jest.fn(),
  } as unknown as StatefulStreamsAppRouter);

const createNotifications = () =>
  ({
    toasts: { addSuccess: jest.fn() },
  } as unknown as CoreStart['notifications']);

const createShare = (
  locatorGetUrl = jest.fn(async () => '/app/management/data/index_management'),
  hasLocator = true
) =>
  ({
    url: {
      locators: {
        get: jest.fn(() => (hasLocator ? { getUrl: locatorGetUrl } : undefined)),
      },
    },
  } as unknown as SharePublicStart);

describe('buildLifecycleTabActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('exposes the copy action with the expected test subject and aria label', () => {
    const actions = buildLifecycleTabActions({
      definition: createMockClassicStreamDefinition(),
      notifications: createNotifications(),
      share: createShare(),
      router: createRouter(),
      timeRange,
    });

    expect(actions['data-test-subj']).toBe('streamsLifecycleTabActionsButton');
    const copyItem = actions.items.find((item) => item.id === 'copy');
    expect(copyItem?.['data-test-subj']).toBe('streamsLifecycleTabCopyApiRequest');
  });

  it('copies the lifecycle API request and shows a success toast', () => {
    const notifications = createNotifications();
    const actions = buildLifecycleTabActions({
      definition: createMockClassicStreamDefinition(),
      notifications,
      share: createShare(),
      router: createRouter(),
      timeRange,
    });

    actions.items.find((item) => item.id === 'copy')!.onClick();

    expect(mockCopyToClipboard).toHaveBeenCalledTimes(1);
    expect(mockCopyToClipboard.mock.calls[0][0]).toContain(
      'PUT kbn:/api/streams/logs.classic-test/_ingest'
    );
    expect(notifications.toasts.addSuccess).toHaveBeenCalledTimes(1);
  });

  it('does not show a success toast when copying to clipboard fails', () => {
    mockCopyToClipboard.mockReturnValueOnce(false);
    const notifications = createNotifications();
    const actions = buildLifecycleTabActions({
      definition: createMockClassicStreamDefinition(),
      notifications,
      share: createShare(),
      router: createRouter(),
      timeRange,
    });

    actions.items.find((item) => item.id === 'copy')!.onClick();

    expect(notifications.toasts.addSuccess).not.toHaveBeenCalled();
  });

  describe('classic stream', () => {
    it('does not include the edit index template action when no locator is available', () => {
      const actions = buildLifecycleTabActions({
        definition: createMockClassicStreamDefinition({
          elasticsearch_assets: {
            indexTemplate: 'logs.classic-test@stream',
            componentTemplates: [],
            dataStream: 'logs.classic-test',
          },
        }),
        notifications: createNotifications(),
        share: createShare(undefined, false),
        router: createRouter(),
        timeRange,
      });

      expect(actions.items.find((item) => item.id === 'editTemplate')).toBeUndefined();
    });

    it('disables the edit index template action when no index template name is available', () => {
      const actions = buildLifecycleTabActions({
        definition: createMockClassicStreamDefinition(),
        notifications: createNotifications(),
        share: createShare(),
        router: createRouter(),
        timeRange,
      });

      expect(actions.items.find((item) => item.id === 'editTemplate')?.disabled).toBe(true);
    });

    it('opens the index template edit page in a new tab via the index management locator', async () => {
      const editUrl =
        '/app/management/data/index_management/templates/edit/logs.classic-test@stream';
      const locatorGetUrl = jest.fn(async () => editUrl);
      const windowOpenSpy = jest.spyOn(window, 'open').mockImplementation(() => null);

      const actions = buildLifecycleTabActions({
        definition: createMockClassicStreamDefinition({
          elasticsearch_assets: {
            indexTemplate: 'logs.classic-test@stream',
            componentTemplates: [],
            dataStream: 'logs.classic-test',
          },
        }),
        notifications: createNotifications(),
        share: createShare(locatorGetUrl),
        router: createRouter(),
        timeRange,
      });

      const editItem = actions.items.find((item) => item.id === 'editTemplate')!;
      expect(editItem.disabled).toBe(false);
      await editItem.onClick();

      expect(locatorGetUrl).toHaveBeenCalledWith({
        page: 'index_template_edit',
        indexTemplate: 'logs.classic-test@stream',
      });
      expect(windowOpenSpy).toHaveBeenCalledWith(editUrl, '_blank');

      windowOpenSpy.mockRestore();
    });
  });

  describe('wired stream', () => {
    it('does not include the edit index template action', () => {
      const actions = buildLifecycleTabActions({
        definition: createMockWiredStreamDefinition(),
        notifications: createNotifications(),
        share: createShare(),
        router: createRouter(),
        timeRange,
      });

      expect(actions.items.find((item) => item.id === 'editTemplate')).toBeUndefined();
    });

    it('navigates to the parent stream lifecycle tab via the edit parent stream action', () => {
      const router = createRouter();
      const actions = buildLifecycleTabActions({
        definition: createMockWiredStreamDefinition(),
        notifications: createNotifications(),
        share: createShare(),
        router,
        timeRange,
      });

      const editItem = actions.items.find((item) => item.id === 'editParentStream')!;
      expect(editItem['data-test-subj']).toBe('streamsLifecycleTabEditParentStream');
      editItem.onClick();

      expect(router.push).toHaveBeenCalledWith('/{key}/management/{tab}', {
        path: { key: 'logs', tab: 'lifecycle' },
        query: { rangeFrom: 'now-15m', rangeTo: 'now' },
      });
    });

    it('omits the edit parent stream action for a root stream', () => {
      const actions = buildLifecycleTabActions({
        definition: createMockWiredStreamDefinition({
          stream: {
            ...createMockWiredStreamDefinition().stream,
            name: 'logs',
          },
        }),
        notifications: createNotifications(),
        share: createShare(),
        router: createRouter(),
        timeRange,
      });

      expect(actions.items.find((item) => item.id === 'editParentStream')).toBeUndefined();
    });
  });
});
