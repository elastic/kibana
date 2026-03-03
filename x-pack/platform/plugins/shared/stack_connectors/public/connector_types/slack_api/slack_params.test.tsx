/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import SlackParamsFields from './slack_params';
import type { AppMockRenderer } from '../lib/test_utils';
import { createAppMockRenderer } from '../lib/test_utils';
import userEvent from '@testing-library/user-event';

const triggersActionsPath = '@kbn/triggers-actions-ui-plugin/public';

const mockToasts = { addDanger: jest.fn(), addWarning: jest.fn() };

jest.mock(triggersActionsPath, () => {
  const original = jest.requireActual(triggersActionsPath);
  return {
    ...original,
    useKibana: () => ({
      ...original.useKibana(),
      services: {
        notifications: { toasts: mockToasts },
      },
    }),
  };
});

describe('SlackParamsFields', () => {
  const actionConnector = {
    secrets: {},
    config: {},
    id: 'test',
    actionTypeId: '.slack_api',
    name: 'slack',
    isDeprecated: false,
    isPreconfigured: false as const,
    isSystemAction: false,
    isConnectorTypeDeprecated: false,
  };

  const actionConnectorWithAllowedList = {
    ...actionConnector,
    id: 'test-2',
    config: { allowedChannels: [{ name: '#test' }, { name: '#general' }] },
  };

  const actionParams = {
    subAction: 'postMessage' as const,
    subActionParams: {
      channels: ['my-channel'],
      channelIds: ['my-channel-id'],
      channelNames: ['my-channel-name'],
      text: 'a new slack message',
    },
  };

  const testBlock = JSON.stringify({
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: 'Some **text**',
        },
      },
    ],
  });

  const editAction = jest.fn();
  let appMockRenderer: AppMockRenderer;

  beforeEach(() => {
    appMockRenderer = createAppMockRenderer();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('changing connector resets the fields', async () => {
    const { rerender } = appMockRenderer.render(
      <SlackParamsFields
        actionParams={{}}
        editAction={editAction}
        index={0}
        errors={{ message: [] }}
        actionConnector={actionConnector}
      />
    );

    expect(screen.getByTestId('webApiTextTextArea')).toBeInTheDocument();

    await userEvent.click(screen.getByTestId('webApiTextTextArea'));
    await userEvent.paste('a slack message');

    rerender(
      <SlackParamsFields
        actionParams={{}}
        editAction={editAction}
        index={0}
        errors={{ message: [] }}
        actionConnector={actionConnectorWithAllowedList}
      />
    );

    expect(screen.getByTestId('webApiTextTextArea')).toHaveValue('');

    await waitFor(() => {
      expect(editAction).toHaveBeenCalledWith(
        'subActionParams',
        { channels: [], channelIds: [], channelNames: [], text: undefined },
        0
      );
    });
  });

  it('changing the index resets the fields', async () => {
    const { rerender } = appMockRenderer.render(
      <SlackParamsFields
        actionParams={{}}
        editAction={editAction}
        index={0}
        errors={{ message: [] }}
        actionConnector={actionConnector}
      />
    );

    expect(screen.getByTestId('webApiTextTextArea')).toBeInTheDocument();

    await userEvent.click(screen.getByTestId('webApiTextTextArea'));
    await userEvent.paste('a slack message');

    rerender(
      <SlackParamsFields
        actionParams={{}}
        editAction={editAction}
        index={1}
        errors={{ message: [] }}
        actionConnector={actionConnector}
      />
    );

    expect(screen.getByTestId('webApiTextTextArea')).toHaveValue('');

    await waitFor(() => {
      expect(editAction).toHaveBeenCalledWith(
        'subActionParams',
        { channels: [], channelIds: [], channelNames: [], text: undefined },
        0
      );
    });
  });

  it('changing the connector resets the fields to the new params', async () => {
    const { rerender } = appMockRenderer.render(
      <SlackParamsFields
        actionParams={{}}
        editAction={editAction}
        index={0}
        errors={{ message: [] }}
        actionConnector={actionConnector}
      />
    );

    expect(screen.getByTestId('webApiTextTextArea')).toBeInTheDocument();

    await userEvent.click(screen.getByTestId('webApiTextTextArea'));
    await userEvent.paste('a slack message');

    rerender(
      <SlackParamsFields
        actionParams={actionParams}
        editAction={editAction}
        index={0}
        errors={{ message: [] }}
        actionConnector={actionConnectorWithAllowedList}
      />
    );

    expect(screen.getByTestId('webApiTextTextArea')).toHaveValue('a new slack message');

    await waitFor(() => {
      expect(editAction).toHaveBeenCalledWith('subActionParams', actionParams.subActionParams, 0);
    });
  });

  it('uses the default value if the text is not defined', async () => {
    appMockRenderer.render(
      <SlackParamsFields
        actionParams={{}}
        editAction={editAction}
        index={0}
        errors={{ message: [] }}
        actionConnector={actionConnector}
        defaultMessage="my default message"
      />
    );

    expect(screen.getByTestId('webApiTextTextArea')).toHaveValue('my default message');

    await waitFor(() => {
      expect(editAction).toHaveBeenCalledWith(
        'subActionParams',
        { channels: [], channelIds: [], channelNames: [], text: 'my default message' },
        0
      );
    });
  });

  it('does not uses the default value if text is defined', async () => {
    appMockRenderer.render(
      <SlackParamsFields
        actionParams={actionParams}
        editAction={editAction}
        index={0}
        errors={{ message: [] }}
        actionConnector={actionConnector}
        useDefaultMessage={true}
        defaultMessage="my default message"
      />
    );

    expect(screen.getByTestId('webApiTextTextArea')).toHaveValue('a new slack message');

    await waitFor(() => {
      expect(editAction).toHaveBeenCalledWith('subActionParams', actionParams.subActionParams, 0);
    });
  });

  it('sets the inital values on first render correctly', async () => {
    appMockRenderer.render(
      <SlackParamsFields
        actionParams={{}}
        editAction={editAction}
        index={0}
        errors={{ message: [] }}
        actionConnector={actionConnector}
      />
    );

    await waitFor(() => {
      expect(editAction).toHaveBeenCalledWith('subAction', 'postMessage', 0);
      expect(editAction).toHaveBeenCalledWith(
        'subActionParams',
        { channels: [], channelIds: [], channelNames: [], text: undefined },
        0
      );
    });
  });

  describe('new params', () => {
    const params = {};

    it('renders the initial fields correctly', () => {
      appMockRenderer.render(
        <SlackParamsFields
          actionParams={params}
          editAction={editAction}
          index={0}
          errors={{ message: [] }}
          actionConnector={actionConnector}
        />
      );

      expect(screen.getByTestId('slackMessageTypeChangeButton')).toBeInTheDocument();
      expect(screen.getByTestId('slackChannelsComboBox')).toBeInTheDocument();
      expect(screen.getByTestId('webApiTextTextArea')).toBeInTheDocument();
    });

    it('changes the message type correctly', async () => {
      appMockRenderer.render(
        <SlackParamsFields
          actionParams={params}
          editAction={editAction}
          index={0}
          errors={{ message: [] }}
          actionConnector={actionConnector}
        />
      );

      expect(screen.getByTestId('slackMessageTypeChangeButton')).toBeInTheDocument();

      await userEvent.click(screen.getByText('Block Kit'));

      expect(await screen.findByTestId('webApiBlock')).toBeInTheDocument();
    });

    it('fill out all params (text) and submits correctly', async () => {
      appMockRenderer.render(
        <SlackParamsFields
          actionParams={params}
          editAction={editAction}
          index={0}
          errors={{ message: [] }}
          actionConnector={actionConnector}
        />
      );

      expect(screen.getByTestId('webApiTextTextArea')).toBeInTheDocument();

      await userEvent.click(screen.getByTestId('webApiTextTextArea'));
      await userEvent.paste('a slack message');

      await waitFor(() => {
        expect(editAction).toHaveBeenCalledWith('subAction', 'postMessage', 0);
        expect(editAction).toHaveBeenCalledWith(
          'subActionParams',
          { channels: [], channelIds: [], channelNames: [], text: 'a slack message' },
          0
        );
      });
    });

    it('fill out all params (blockKit) and submits correctly', async () => {
      appMockRenderer.render(
        <SlackParamsFields
          actionParams={params}
          editAction={editAction}
          index={0}
          errors={{ message: [] }}
          actionConnector={actionConnector}
        />
      );

      expect(screen.getByTestId('slackMessageTypeChangeButton')).toBeInTheDocument();
      await userEvent.click(screen.getByText('Block Kit'));
      expect(await screen.findByTestId('webApiBlock')).toBeInTheDocument();

      await userEvent.click(screen.getByTestId('webApiBlockJsonEditor'));
      await userEvent.paste(testBlock);

      await waitFor(() => {
        expect(editAction).toHaveBeenCalledWith('subAction', 'postBlockkit', 0);
        expect(editAction).toHaveBeenCalledWith(
          'subActionParams',
          { channels: [], channelIds: [], channelNames: [], text: testBlock },
          0
        );
      });
    });

    it('resets the textarea when changing tabs', async () => {
      appMockRenderer.render(
        <SlackParamsFields
          actionParams={params}
          editAction={editAction}
          index={0}
          errors={{ message: [] }}
          actionConnector={actionConnector}
        />
      );

      expect(screen.getByTestId('slackMessageTypeChangeButton')).toBeInTheDocument();
      await userEvent.click(screen.getByTestId('webApiTextTextArea'));
      await userEvent.paste('a slack message');

      await userEvent.click(screen.getByText('Block Kit'));
      expect(await screen.findByTestId('webApiBlock')).toBeInTheDocument();

      await userEvent.click(screen.getByText('Text'));
      expect(await screen.findByTestId('webApiTextTextArea')).toHaveValue('');

      await waitFor(() => {
        expect(editAction).toHaveBeenCalledWith('subAction', 'postMessage', 0);
      });
    });

    it('changes the subAction correctly when changing tabs', async () => {
      appMockRenderer.render(
        <SlackParamsFields
          actionParams={params}
          editAction={editAction}
          index={0}
          errors={{ message: [] }}
          actionConnector={actionConnector}
        />
      );

      expect(screen.getByTestId('slackMessageTypeChangeButton')).toBeInTheDocument();
      await userEvent.click(screen.getByText('Block Kit'));
      expect(await screen.findByTestId('webApiBlock')).toBeInTheDocument();

      await waitFor(() => {
        expect(editAction).toHaveBeenCalledWith('subAction', 'postBlockkit', 0);
      });
    });

    it('can set any channel when the allowlist is empty', async () => {
      appMockRenderer.render(
        <SlackParamsFields
          actionParams={params}
          editAction={editAction}
          index={0}
          errors={{ message: [] }}
          actionConnector={actionConnector}
        />
      );

      await userEvent.click(screen.getByTestId('comboBoxSearchInput'));
      await userEvent.type(screen.getByTestId('comboBoxSearchInput'), '#my-channel{enter}');

      await waitFor(() => {
        expect(editAction).toHaveBeenCalledWith(
          'subActionParams',
          {
            channels: undefined,
            channelIds: undefined,
            channelNames: ['#my-channel'],
            text: undefined,
          },
          0
        );
      });
    });

    it('cannot set channels not in the allow list', async () => {
      appMockRenderer.render(
        <SlackParamsFields
          actionParams={params}
          editAction={editAction}
          index={0}
          errors={{ message: [] }}
          actionConnector={actionConnectorWithAllowedList}
        />
      );

      await userEvent.click(screen.getByTestId('comboBoxSearchInput'));
      await userEvent.type(screen.getByTestId('comboBoxSearchInput'), '#my-channel{enter}');

      expect(await screen.findByText(`doesn't match any options`)).toBeInTheDocument();
    });
  });

  describe('editing params', () => {
    const actionParamsWithChannels = {
      subAction: 'postMessage',
      subActionParams: { channels: ['my-channel'] },
    };

    const actionParamsWithChannelsIds = {
      subAction: 'postMessage',
      subActionParams: { channelIds: ['my-channel-id'] },
    };

    const actionParamsWithChannelNames = {
      subAction: 'postMessage',
      subActionParams: { channelNames: ['my-channel-name'] },
    };

    const tests: [string, Record<string, unknown>, string][] = [
      ['channels', actionParamsWithChannels, 'my-channel'],
      ['channelIds', actionParamsWithChannelsIds, 'my-channel-id'],
      ['channelNames', actionParamsWithChannelNames, 'my-channel-name'],
    ];

    it.each(tests)(
      'renders the initial fields correctly %s',
      async (_, params, expectedChannel) => {
        appMockRenderer.render(
          <SlackParamsFields
            actionParams={params}
            editAction={editAction}
            index={0}
            errors={{ message: [] }}
            actionConnector={actionConnector}
          />
        );
        expect(await screen.findByText(expectedChannel)).toBeInTheDocument();
      }
    );

    it.each(tests)(
      'changes to channelNames when editing the channels for %s',
      async (_, params, expectedChannel) => {
        appMockRenderer.render(
          <SlackParamsFields
            actionParams={params}
            editAction={editAction}
            index={0}
            errors={{ message: [] }}
            actionConnector={actionConnector}
          />
        );

        expect(await screen.findByText(expectedChannel)).toBeInTheDocument();

        await userEvent.click(screen.getByTestId('comboBoxClearButton'));
        await userEvent.click(screen.getByTestId('comboBoxSearchInput'));
        await userEvent.type(screen.getByTestId('comboBoxSearchInput'), '#my-channel{enter}');

        await waitFor(() => {
          expect(editAction).toHaveBeenCalledWith(
            'subActionParams',
            {
              channels: undefined,
              channelIds: undefined,
              channelNames: ['#my-channel'],
              text: undefined,
            },
            0
          );
        });
      }
    );

    it.each(tests)(
      'does not change the %s when editing the text field',
      async (key, params, expectedChannel) => {
        appMockRenderer.render(
          <SlackParamsFields
            actionParams={params}
            editAction={editAction}
            index={0}
            errors={{ message: [] }}
            actionConnector={actionConnector}
          />
        );

        expect(await screen.findByText(expectedChannel)).toBeInTheDocument();

        await userEvent.click(screen.getByTestId('webApiTextTextArea'));
        await userEvent.paste('a slack message');

        await waitFor(() => {
          expect(editAction).toHaveBeenCalledWith(
            'subActionParams',
            {
              channels: [],
              channelIds: [],
              channelNames: [],
              /**
               * The value below will overwrite one of the values above.
               * For each test a different value will be overwritten.
               */
              [key]: [expectedChannel],
              text: 'a slack message',
            },
            0
          );
        });
      }
    );
  });
});
