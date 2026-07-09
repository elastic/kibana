/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent, { PointerEventsCheckLevel } from '@testing-library/user-event';
import type { CoreStart } from '@kbn/core/public';
import type { SharePublicStart } from '@kbn/share-plugin/public/plugin';
import { copyToClipboard } from '@elastic/eui';
import {
  createMockClassicStreamDefinition,
  createMockWiredStreamDefinition,
} from '../shared/mocks/stream_definitions';
import {
  LifecycleTabLabel,
  LifecycleTabLabelWithActions,
} from './lifecycle_tab_label_with_actions';

jest.mock('@elastic/eui', () => {
  const actual = jest.requireActual('@elastic/eui');
  return {
    ...actual,
    copyToClipboard: jest.fn(() => true),
  };
});

const mockPush = jest.fn();
jest.mock('../../../../hooks/use_streams_app_router', () => ({
  useStreamsAppRouter: () => ({
    push: mockPush,
    link: jest.fn(),
    replace: jest.fn(),
  }),
}));

jest.mock('../../../../hooks/use_time_range', () => ({
  useTimeRange: () => ({
    rangeFrom: 'now-15m',
    rangeTo: 'now',
  }),
}));

const mockCopyToClipboard = copyToClipboard as jest.Mock;

const openActionsMenu = async () => {
  await userEvent.click(screen.getByTestId('streamsLifecycleTabActionsButton'));
};

// The EUI popover panel sets `pointer-events: none` during its open animation in jsdom,
// so menu items must be clicked without the pointer-events check.
const clickMenuItem = async (testSubj: string) => {
  await userEvent.click(screen.getByTestId(testSubj), {
    pointerEventsCheck: PointerEventsCheckLevel.Never,
  });
};

describe('LifecycleTabLabelWithActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('always renders the tab label', () => {
    render(<LifecycleTabLabelWithActions showActions={false} onCopy={jest.fn()} />);

    expect(screen.getByTestId('retentionTab')).toHaveTextContent('Data lifecycle');
  });

  it('does not render the actions button when showActions is false', () => {
    render(<LifecycleTabLabelWithActions showActions={false} onCopy={jest.fn()} />);

    expect(screen.queryByTestId('streamsLifecycleTabActionsButton')).not.toBeInTheDocument();
  });

  it('renders the actions button when showActions is true', () => {
    render(<LifecycleTabLabelWithActions showActions onCopy={jest.fn()} />);

    expect(screen.getByTestId('streamsLifecycleTabActionsButton')).toBeInTheDocument();
  });

  it('calls onCopy when the copy menu item is clicked', async () => {
    const onCopy = jest.fn();
    render(<LifecycleTabLabelWithActions showActions onCopy={onCopy} />);

    await openActionsMenu();
    await clickMenuItem('streamsLifecycleTabCopyApiRequest');

    expect(onCopy).toHaveBeenCalledTimes(1);
  });

  it('does not render the edit action item when editAction is not provided', async () => {
    render(<LifecycleTabLabelWithActions showActions onCopy={jest.fn()} />);

    await openActionsMenu();

    expect(screen.queryByTestId('streamsLifecycleTabEditIndexTemplate')).not.toBeInTheDocument();
    expect(screen.queryByTestId('streamsLifecycleTabEditParentStream')).not.toBeInTheDocument();
  });

  it('disables the edit action item when editAction is disabled', async () => {
    render(
      <LifecycleTabLabelWithActions
        showActions
        onCopy={jest.fn()}
        editAction={{
          label: 'Edit index template',
          disabled: true,
          onClick: jest.fn(),
          'data-test-subj': 'streamsLifecycleTabEditIndexTemplate',
        }}
      />
    );

    await openActionsMenu();

    expect(screen.getByTestId('streamsLifecycleTabEditIndexTemplate')).toBeDisabled();
  });

  it('calls editAction.onClick when enabled', async () => {
    const onClick = jest.fn();
    render(
      <LifecycleTabLabelWithActions
        showActions
        onCopy={jest.fn()}
        editAction={{
          label: 'Edit index template',
          onClick,
          'data-test-subj': 'streamsLifecycleTabEditIndexTemplate',
        }}
      />
    );

    await openActionsMenu();
    await clickMenuItem('streamsLifecycleTabEditIndexTemplate');

    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe('LifecycleTabLabel', () => {
  const createWiredDefinition = (streamName: string) => {
    const baseDefinition = createMockWiredStreamDefinition();
    return createMockWiredStreamDefinition({
      stream: {
        ...baseDefinition.stream,
        name: streamName,
      },
    });
  };

  const createClassicDefinition = (indexTemplate?: string) =>
    createMockClassicStreamDefinition(
      indexTemplate
        ? {
            elasticsearch_assets: {
              indexTemplate,
              componentTemplates: [],
              dataStream: 'logs-test',
            },
          }
        : {}
    );

  const createNotifications = () =>
    ({
      toasts: { addSuccess: jest.fn() },
    } as unknown as CoreStart['notifications']);

  const createShare = (
    locatorGetUrl = jest.fn(async () => '/app/management/data/index_management')
  ) =>
    ({
      url: {
        locators: {
          get: jest.fn(() => ({ getUrl: locatorGetUrl })),
        },
      },
    } as unknown as SharePublicStart);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('copies the lifecycle API request and shows a success toast', async () => {
    const notifications = createNotifications();

    render(
      <LifecycleTabLabel
        definition={createWiredDefinition('logs-test')}
        showActions
        notifications={notifications}
        share={createShare()}
      />
    );

    await openActionsMenu();
    await clickMenuItem('streamsLifecycleTabCopyApiRequest');

    expect(mockCopyToClipboard).toHaveBeenCalledTimes(1);
    const copied = mockCopyToClipboard.mock.calls[0][0];
    expect(copied).toContain('PUT kbn:/api/streams/logs-test/_ingest');
    expect(notifications.toasts.addSuccess).toHaveBeenCalledTimes(1);
  });

  it('does not show a success toast when copying to clipboard fails', async () => {
    mockCopyToClipboard.mockReturnValueOnce(false);
    const notifications = createNotifications();

    render(
      <LifecycleTabLabel
        definition={createWiredDefinition('logs-test')}
        showActions
        notifications={notifications}
        share={createShare()}
      />
    );

    await openActionsMenu();
    await clickMenuItem('streamsLifecycleTabCopyApiRequest');

    expect(notifications.toasts.addSuccess).not.toHaveBeenCalled();
  });

  it('opens the index template edit page in a new tab for classic streams', async () => {
    const editUrl = '/app/management/data/index_management/templates/edit/logs@stream';
    const locatorGetUrl = jest.fn(async () => editUrl);
    const windowOpenSpy = jest.spyOn(window, 'open').mockImplementation(() => null);

    render(
      <LifecycleTabLabel
        definition={createClassicDefinition('logs@stream')}
        showActions
        notifications={createNotifications()}
        share={createShare(locatorGetUrl)}
      />
    );

    await openActionsMenu();
    await clickMenuItem('streamsLifecycleTabEditIndexTemplate');

    expect(locatorGetUrl).toHaveBeenCalledWith({
      page: 'index_template_edit',
      indexTemplate: 'logs@stream',
    });
    expect(windowOpenSpy).toHaveBeenCalledWith(editUrl, '_blank');

    windowOpenSpy.mockRestore();
  });

  it('does not render the edit action for wired root streams', async () => {
    render(
      <LifecycleTabLabel
        definition={createWiredDefinition('logs')}
        showActions
        notifications={createNotifications()}
        share={createShare()}
      />
    );

    await openActionsMenu();

    expect(screen.queryByTestId('streamsLifecycleTabEditParentStream')).not.toBeInTheDocument();
    expect(screen.queryByTestId('streamsLifecycleTabEditIndexTemplate')).not.toBeInTheDocument();
  });

  it('navigates to the parent stream lifecycle page for wired child streams', async () => {
    render(
      <LifecycleTabLabel
        definition={createWiredDefinition('logs.child')}
        showActions
        notifications={createNotifications()}
        share={createShare()}
      />
    );

    await openActionsMenu();

    expect(screen.getByTestId('streamsLifecycleTabEditParentStream')).toHaveTextContent(
      'Edit parent stream'
    );

    await clickMenuItem('streamsLifecycleTabEditParentStream');

    expect(mockPush).toHaveBeenCalledWith('/{key}/management/{tab}', {
      path: { key: 'logs', tab: 'lifecycle' },
      query: { rangeFrom: 'now-15m', rangeTo: 'now' },
    });
  });
});
