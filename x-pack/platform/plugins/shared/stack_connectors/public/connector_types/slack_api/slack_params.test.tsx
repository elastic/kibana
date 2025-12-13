/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import SlackParamsFields from './slack_params';
import type { UseSubActionParams } from '@kbn/triggers-actions-ui-plugin/public/application/hooks/use_sub_action';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import type { ActionConnector } from '@kbn/triggers-actions-ui-plugin/public';
import userEvent from '@testing-library/user-event';

interface Result {
  isLoading: boolean;
  response: Record<string, unknown>;
  error: null | Error;
}

const triggersActionsPath = '@kbn/triggers-actions-ui-plugin/public';

const mockUseValidChanelId = jest.fn().mockImplementation(() => ({
  isLoading: false,
  response: {
    channel: {
      id: 'id',
      name: 'general',
      is_channel: true,
      is_archived: false,
      is_private: true,
    },
  },
  error: null,
}));
const testBlock = {
  blocks: [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: "Hello, Assistant to the Regional Manager Dwight! *Michael Scott* wants to know where you'd like to take the Paper Company investors to dinner tonight.\n",
      },
    },
  ],
};
const mockUseSubAction = jest.fn<Result, [UseSubActionParams<unknown>]>(mockUseValidChanelId);

const mockToasts = { addDanger: jest.fn(), addWarning: jest.fn() };
jest.mock(triggersActionsPath, () => {
  const original = jest.requireActual(triggersActionsPath);
  return {
    ...original,
    useSubAction: (params: UseSubActionParams<unknown>) => mockUseSubAction(params),
    useKibana: () => ({
      ...original.useKibana(),
      services: {
        notifications: { toasts: mockToasts },
      },
    }),
  };
});

interface TestWrapperProps {
  actionParams?: any;
  actionConnector?: ActionConnector;
  errors?: any;
  editAction?: jest.MockedFunction<any>;
  index?: number;
  defaultMessage?: string;
  messageVariables?: any[];
  useDefaultMessage?: boolean;
}

const TestWrapper: React.FC<TestWrapperProps> = ({
  actionParams = {},
  actionConnector,
  errors = { message: [] },
  editAction = () => {},
  index = 0,
  defaultMessage = 'default message',
  messageVariables = [],
  useDefaultMessage,
}) => {
  return (
    <IntlProvider locale="en">
      <SlackParamsFields
        actionParams={actionParams}
        actionConnector={actionConnector}
        errors={errors}
        editAction={editAction}
        index={index}
        defaultMessage={defaultMessage}
        messageVariables={messageVariables}
        useDefaultMessage={useDefaultMessage}
      />
    </IntlProvider>
  );
};

describe('SlackParamsFields renders', () => {
  beforeEach(() => {
    mockUseSubAction.mockClear();
    mockUseValidChanelId.mockClear();
    mockUseValidChanelId.mockImplementation(() => ({
      isLoading: false,
      response: {
        channel: {
          id: 'id',
          name: 'general',
          is_channel: true,
          is_archived: false,
          is_private: true,
        },
      },
      error: null,
    }));
  });

  it('when useDefaultMessage is set to true and the default message changes, the underlying message is replaced with the default message', () => {
    const editAction = jest.fn();
    const { rerender } = render(
      <TestWrapper
        actionParams={{
          subAction: 'postMessage',
          subActionParams: { channels: ['general'], text: 'some text' },
        }}
        errors={{ message: [] }}
        editAction={editAction}
        index={0}
        defaultMessage="default message"
        messageVariables={[]}
        useDefaultMessage={true}
      />
    );
    expect(screen.getByTestId('webApiTextTextArea')).toBeInTheDocument();
    expect(screen.getByTestId('webApiTextTextArea')).toHaveValue('some text');
    rerender(
      <TestWrapper
        actionParams={{
          subAction: 'postMessage',
          subActionParams: { channels: ['general'], text: 'some text' },
        }}
        errors={{ message: [] }}
        editAction={editAction}
        index={0}
        defaultMessage="some different default message"
        messageVariables={[]}
        useDefaultMessage={true}
      />
    );
    expect(editAction).toHaveBeenCalledWith(
      'subActionParams',
      { channels: ['general'], channelIds: [], text: 'some different default message' },
      0
    );
  });

  it('when useDefaultMessage is set to false and the default message changes, the underlying message is not changed, Web API', () => {
    const editAction = jest.fn();
    const { rerender } = render(
      <TestWrapper
        actionParams={{
          subAction: 'postMessage',
          subActionParams: { channels: ['general'], text: 'some text' },
        }}
        errors={{ message: [] }}
        editAction={editAction}
        index={0}
        defaultMessage="default message"
        messageVariables={[]}
        useDefaultMessage={false}
      />
    );
    expect(screen.getByTestId('webApiTextTextArea')).toBeInTheDocument();
    expect(screen.getByTestId('webApiTextTextArea')).toHaveValue('some text');

    rerender(
      <TestWrapper
        actionParams={{
          subAction: 'postMessage',
          subActionParams: { channels: ['general'], text: 'some text' },
        }}
        errors={{ message: [] }}
        editAction={editAction}
        index={0}
        defaultMessage="some different default message"
        messageVariables={[]}
        useDefaultMessage={false}
      />
    );
    expect(editAction).not.toHaveBeenCalled();
  });

  it('default to text field when no existing subaction params', async () => {
    render(
      <TestWrapper
        actionParams={{}}
        errors={{ message: [] }}
        editAction={() => {}}
        index={0}
        defaultMessage="default message"
        messageVariables={[]}
      />
    );

    expect(screen.getByTestId('webApiTextTextArea')).toBeInTheDocument();
    expect(screen.getByTestId('webApiTextTextArea')).toHaveValue('');
  });

  it('correctly renders params fields for postMessage subaction', async () => {
    render(
      <TestWrapper
        actionConnector={
          {
            id: 'connector-id',
            actionTypeId: '.slack_api',
            config: {},
          } as ActionConnector
        }
        actionParams={{
          subAction: 'postMessage',
          subActionParams: { channels: ['general'], text: 'some text' },
        }}
        errors={{ message: [] }}
        editAction={() => {}}
        index={0}
        defaultMessage="default message"
        messageVariables={[]}
      />
    );

    expect(screen.getByTestId('slackMessageTypeChangeButton')).toBeInTheDocument();
    expect(screen.getByTestId('webApiTextTextArea')).toBeInTheDocument();
    expect(screen.getByTestId('webApiTextTextArea')).toHaveValue('some text');
  });

  it('correctly renders params fields for postBlockkit subaction', async () => {
    render(
      <TestWrapper
        actionConnector={
          {
            id: 'connector-id',
            actionTypeId: '.slack_api',
            config: {},
          } as ActionConnector
        }
        actionParams={{
          subAction: 'postBlockkit',
          subActionParams: { channels: ['general'], text: JSON.stringify(testBlock) },
        }}
        errors={{ message: [] }}
        editAction={() => {}}
        index={0}
        defaultMessage="default message"
        messageVariables={[]}
      />
    );

    expect(screen.getByTestId('slackMessageTypeChangeButton')).toBeInTheDocument();
    expect(screen.getByTestId('webApiBlock')).toBeInTheDocument();
  });

  it('should toggle subaction when button group clicked', async () => {
    const mockEditFunc = jest.fn();
    render(
      <TestWrapper
        actionConnector={
          {
            id: 'connector-id',
            actionTypeId: '.slack_api',
            config: {},
          } as ActionConnector
        }
        actionParams={{
          subAction: 'postMessage',
          subActionParams: { channels: ['general'], text: 'some text' },
        }}
        errors={{ message: [] }}
        editAction={mockEditFunc}
        index={0}
        defaultMessage="default message"
        messageVariables={[]}
      />
    );

    await userEvent.click(screen.getByTestId('blockkit'));
    expect(mockEditFunc).toBeCalledWith('subAction', 'postBlockkit', 0);

    await userEvent.click(screen.getByTestId('text'));
    expect(mockEditFunc).toBeCalledWith('subAction', 'postMessage', 0);
  });

  it('show the channel label when using the old attribute "channels" in subActionParams', async () => {
    const mockEditFunc = jest.fn();
    render(
      <TestWrapper
        actionParams={{
          subAction: 'postMessage',
          subActionParams: { channels: ['old channel name'], text: 'some text' },
        }}
        actionConnector={
          {
            id: 'connector-id',
            config: {},
          } as ActionConnector
        }
        errors={{ message: [] }}
        editAction={mockEditFunc}
        index={0}
        defaultMessage="default message"
        messageVariables={[]}
      />
    );

    expect(screen.findByText('Channel')).toBeTruthy();
    expect(screen.getByTestId('slackApiChannelId')).toBeInTheDocument();
    expect(screen.getByTestId('slackApiChannelId')).toHaveValue('old channel name');
  });

  it('show the channel ID label when using the new attribute "channelIds" in subActionParams', async () => {
    const mockEditFunc = jest.fn();
    render(
      <TestWrapper
        actionParams={{
          subAction: 'postMessage',
          subActionParams: { channelIds: ['channel-id-xxx'], text: 'some text' },
        }}
        actionConnector={
          {
            id: 'connector-id',
            config: {},
          } as ActionConnector
        }
        errors={{ message: [] }}
        editAction={mockEditFunc}
        index={0}
        defaultMessage="default message"
        messageVariables={[]}
      />
    );

    expect(screen.findByText('Channel ID')).toBeTruthy();
    expect(screen.getByTestId('slackApiChannelId')).toBeInTheDocument();
    expect(screen.getByTestId('slackApiChannelId')).toHaveValue('channel-id-xxx');
  });

  it('channel id in subActionParams should be validated', async () => {
    const mockEditFunc = jest.fn();
    mockUseValidChanelId.mockImplementation(() => ({
      isLoading: false,
      response: {
        channel: {
          id: 'new-channel-id',
          name: 'new channel id',
          is_channel: true,
          is_archived: false,
          is_private: true,
        },
      },
      error: null,
    }));

    render(
      <TestWrapper
        actionParams={{
          subAction: 'postMessage',
          subActionParams: { channelIds: ['new-channel-id'], text: 'some text' },
        }}
        actionConnector={
          {
            id: 'connector-id',
            config: {},
          } as ActionConnector
        }
        errors={{ message: [] }}
        editAction={mockEditFunc}
        index={0}
        defaultMessage="default message"
        messageVariables={[]}
      />
    );
    await userEvent.click(screen.getByTestId('slackApiChannelId'));
    await userEvent.clear(screen.getByTestId('slackApiChannelId'));
    fireEvent.change(screen.getByTestId('slackApiChannelId'), {
      target: { value: 'new-channel-id' },
    });
    await userEvent.tab();

    await waitFor(() => {
      expect(mockEditFunc).toBeCalledWith(
        'subActionParams',
        { channelIds: ['new-channel-id'], channels: undefined, text: 'some text' },
        0
      );
      expect(mockUseSubAction).toBeCalledWith({
        connectorId: 'connector-id',
        disabled: false,
        subAction: 'validChannelId',
        subActionParams: {
          channelId: 'new-channel-id',
        },
      });
    });
  });

  it('channel id work with combobox when allowedChannels pass in the config attributes', async () => {
    const mockEditFunc = jest.fn();
    render(
      <TestWrapper
        actionParams={{
          subAction: 'postMessage',
          subActionParams: { channelIds: ['channel-id-1'], text: 'some text' },
        }}
        actionConnector={
          {
            id: 'connector-id',
            config: {
              allowedChannels: [
                {
                  id: 'channel-id-1',
                  name: 'channel 1',
                },
                {
                  id: 'channel-id-2',
                  name: 'channel 2',
                },
                {
                  id: 'channel-id-3',
                  name: 'channel 3',
                },
              ],
            },
          } as unknown as ActionConnector
        }
        errors={{ message: [] }}
        editAction={mockEditFunc}
        index={0}
        defaultMessage="default message"
        messageVariables={[]}
      />
    );

    expect(screen.findByText('Channel ID')).toBeTruthy();
    expect(screen.getByTestId('slackChannelsComboBox')).toBeInTheDocument();
    expect(screen.getByTestId('slackChannelsComboBox').textContent).toBe(
      'channel-id-1 - channel 1'
    );

    const combobox = screen.getByTestId('slackChannelsComboBox');
    const inputCombobox = within(combobox).getByTestId('comboBoxSearchInput');
    await userEvent.click(inputCombobox);

    await waitFor(() => {
      expect(screen.getByTestId('channel-id-1')).toBeInTheDocument();
      expect(screen.getByTestId('channel-id-2')).toBeInTheDocument();
      expect(screen.getByTestId('channel-id-3')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByTestId('channel-id-3'));

    await waitFor(() => {
      expect(
        within(screen.getByTestId('slackChannelsComboBox')).getByText('channel-id-3 - channel 3')
      ).toBeInTheDocument();

      expect(mockEditFunc).toBeCalledWith(
        'subActionParams',
        { channelIds: ['channel-id-3'], channels: undefined, text: 'some text' },
        0
      );

      expect(mockUseSubAction).toBeCalledWith({
        connectorId: 'connector-id',
        disabled: false,
        subAction: 'validChannelId',
        subActionParams: { channelId: 'channel-id-1' },
      });
    });
  });

  it('show error message when no channel is selected', async () => {
    render(
      <TestWrapper
        actionParams={{
          subAction: 'postMessage',
          subActionParams: { channels: [], text: 'some text' },
        }}
        errors={{ message: [], channels: ['my error message'] }}
        editAction={() => {}}
        index={0}
        defaultMessage="default message"
        messageVariables={[]}
      />
    );
    expect(screen.getByText('my error message')).toBeInTheDocument();
  });

  it('should not call useSubAction if the channelIds is empty', async () => {
    render(
      <TestWrapper
        actionParams={{
          subAction: 'postMessage',
          subActionParams: { channelIds: [''], text: 'some text' },
        }}
        actionConnector={
          {
            id: 'connector-id',
            config: {},
          } as ActionConnector
        }
        errors={{ message: [] }}
        editAction={() => {}}
        index={0}
        defaultMessage="default message"
        messageVariables={[]}
      />
    );

    expect(mockUseSubAction).toHaveBeenCalledWith(expect.objectContaining({ disabled: true }));
  });

  it('should not call useSubAction if the allowedChannels.id is empty', async () => {
    render(
      <TestWrapper
        actionParams={{
          subAction: 'postMessage',
          subActionParams: { text: 'some text' },
        }}
        // @ts-expect-error: not all attributes are needed
        actionConnector={{
          id: 'connector-id',
          config: { allowedChannels: [{ id: '', name: 'no id channel' }] },
        }}
        errors={{ message: [] }}
        editAction={() => {}}
        index={0}
        defaultMessage="default message"
        messageVariables={[]}
      />
    );

    expect(mockUseSubAction).toHaveBeenCalledWith(expect.objectContaining({ disabled: true }));
  });

  it('should make a call to useSubAction with the correct channel ID', async () => {
    const mockEditFunc = jest.fn();
    render(
      <TestWrapper
        actionParams={{
          subAction: 'postMessage',
          subActionParams: { channelIds: ['the-channel'], text: 'some text' },
        }}
        actionConnector={
          {
            id: 'connector-id',
            config: {},
          } as ActionConnector
        }
        errors={{ message: [] }}
        editAction={mockEditFunc}
        index={0}
        defaultMessage="default message"
        messageVariables={[]}
      />
    );

    await waitFor(() => {
      expect(mockUseSubAction).toHaveBeenCalledWith({
        connectorId: 'connector-id',
        disabled: false,
        subAction: 'validChannelId',
        subActionParams: { channelId: 'the-channel' },
      });
    });
  });

  it('should set the channelIds to the first item allowedChannelsConfig if the channelIds is not set', async () => {
    const mockEditFunc = jest.fn();
    render(
      <TestWrapper
        actionParams={{}}
        actionConnector={
          {
            id: 'connector-id',
            config: {
              allowedChannels: [
                { id: 'allowed-1', name: 'Allowed 1' },
                { id: 'allowed-2', name: 'Allowed 2' },
              ],
            },
          } as unknown as ActionConnector
        }
        errors={{ message: [] }}
        editAction={mockEditFunc}
        index={0}
        defaultMessage="default message"
        messageVariables={[]}
      />
    );

    await waitFor(() => {
      expect(mockEditFunc).toHaveBeenCalledWith(
        'subActionParams',
        { channels: [], channelIds: ['allowed-1'], text: undefined },
        0
      );
    });
  });

  it('should set the channelIds to the first item in the channelIds if is set', async () => {
    render(
      <TestWrapper
        actionParams={{
          subAction: 'postMessage',
          subActionParams: { channelIds: ['first-id', 'second-id'], text: 'some text' },
        }}
        actionConnector={
          {
            id: 'connector-id',
            config: {},
          } as ActionConnector
        }
        errors={{ message: [] }}
        editAction={() => {}}
        index={0}
        defaultMessage="default message"
        messageVariables={[]}
      />
    );

    expect(screen.getByTestId('slackApiChannelId')).toBeInTheDocument();
    expect(screen.getByTestId('slackApiChannelId')).toHaveValue('first-id');
  });

  it('channelIds should take priority over allowedChannels', async () => {
    render(
      <TestWrapper
        actionParams={{
          subAction: 'postMessage',
          subActionParams: { channelIds: ['first-id'], text: 'some text' },
        }}
        // @ts-expect-error: not all attributes are needed
        actionConnector={{
          id: 'connector-id',
          config: {
            allowedChannels: [
              { id: 'allowed-1', name: 'Allowed 1' },
              { id: 'allowed-2', name: 'Allowed 2' },
            ],
          },
        }}
        errors={{ message: [] }}
        editAction={() => {}}
        index={0}
        defaultMessage="default message"
        messageVariables={[]}
      />
    );

    expect(screen.getByText('first-id')).toBeInTheDocument();
  });
});
