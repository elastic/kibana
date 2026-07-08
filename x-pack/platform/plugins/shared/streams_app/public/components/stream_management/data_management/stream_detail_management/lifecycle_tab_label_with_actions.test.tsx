/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Streams } from '@kbn/streams-schema';
import type { CoreStart } from '@kbn/core/public';
import type { SharePublicStart } from '@kbn/share-plugin/public/plugin';
import { copyToClipboard } from '@elastic/eui';
import { buildLifecycleTabActions } from './lifecycle_tab_label_with_actions';

jest.mock('@elastic/eui', () => {
  const actual = jest.requireActual('@elastic/eui');
  return {
    ...actual,
    copyToClipboard: jest.fn(() => true),
  };
});

const mockCopyToClipboard = copyToClipboard as jest.Mock;

const createDefinition = (): Streams.WiredStream.GetResponse => ({
  stream: {
    type: 'wired',
    name: 'logs-test',
    description: '',
    updated_at: '2026-01-01T00:00:00.000Z',
    ingest: {
      lifecycle: { dsl: { data_retention: '30d' } },
      processing: { steps: [], updated_at: '2026-01-01T00:00:00.000Z' },
      settings: {},
      wired: { fields: {}, routing: [] },
      failure_store: { inherit: {} },
    },
  },
  effective_lifecycle: { dsl: { data_retention: '30d' }, from: 'logs-test' },
  effective_settings: {},
  data_stream_exists: true,
  inherited_fields: {},
  dashboards: [],
  rules: [],
  privileges: {
    manage: true,
    monitor: true,
    lifecycle: true,
    simulate: true,
    text_structure: true,
    read_failure_store: true,
    manage_failure_store: true,
    view_index_metadata: true,
    create_snapshot_repository: true,
  },
  effective_failure_store: {
    lifecycle: { enabled: { is_default_retention: true } },
    from: 'logs-test',
  },
});

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
      definition: createDefinition(),
      notifications: createNotifications(),
      share: createShare(),
    });

    expect(actions['data-test-subj']).toBe('streamsLifecycleTabActionsButton');
    const copyItem = actions.items.find((item) => item.id === 'copy');
    expect(copyItem?.['data-test-subj']).toBe('streamsLifecycleTabCopyApiRequest');
  });

  it('copies the lifecycle API request and shows a success toast', () => {
    const notifications = createNotifications();
    const actions = buildLifecycleTabActions({
      definition: createDefinition(),
      notifications,
      share: createShare(),
    });

    actions.items.find((item) => item.id === 'copy')!.onClick();

    expect(mockCopyToClipboard).toHaveBeenCalledTimes(1);
    expect(mockCopyToClipboard.mock.calls[0][0]).toContain('PUT kbn:/api/streams/logs-test/_ingest');
    expect(notifications.toasts.addSuccess).toHaveBeenCalledTimes(1);
  });

  it('does not show a success toast when copying to clipboard fails', () => {
    mockCopyToClipboard.mockReturnValueOnce(false);
    const notifications = createNotifications();
    const actions = buildLifecycleTabActions({
      definition: createDefinition(),
      notifications,
      share: createShare(),
    });

    actions.items.find((item) => item.id === 'copy')!.onClick();

    expect(notifications.toasts.addSuccess).not.toHaveBeenCalled();
  });

  it('does not include the edit index template action when no locator is available', () => {
    const actions = buildLifecycleTabActions({
      definition: createDefinition(),
      notifications: createNotifications(),
      share: createShare(undefined, false),
    });

    expect(actions.items.find((item) => item.id === 'editTemplate')).toBeUndefined();
  });

  it('disables the edit index template action when no index template name is available', () => {
    const actions = buildLifecycleTabActions({
      definition: createDefinition(),
      notifications: createNotifications(),
      share: createShare(),
    });

    expect(actions.items.find((item) => item.id === 'editTemplate')?.disabled).toBe(true);
  });

  it('opens the index template edit page in a new tab via the index management locator', async () => {
    const editUrl = '/app/management/data/index_management/templates/edit/logs@stream';
    const locatorGetUrl = jest.fn(async () => editUrl);
    const windowOpenSpy = jest.spyOn(window, 'open').mockImplementation(() => null);

    const actions = buildLifecycleTabActions({
      definition: createDefinition(),
      indexTemplateName: 'logs@stream',
      notifications: createNotifications(),
      share: createShare(locatorGetUrl),
    });

    const editItem = actions.items.find((item) => item.id === 'editTemplate')!;
    expect(editItem.disabled).toBe(false);
    await editItem.onClick();

    expect(locatorGetUrl).toHaveBeenCalledWith({
      page: 'index_template_edit',
      indexTemplate: 'logs@stream',
    });
    expect(windowOpenSpy).toHaveBeenCalledWith(editUrl, '_blank');

    windowOpenSpy.mockRestore();
  });
});
