/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { ActionParamsProps } from '@kbn/triggers-actions-ui-plugin/public';
import { JsonEditorWithMessageVariables } from '@kbn/triggers-actions-ui-plugin/public';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { TextAreaWithMessageVariables } from '@kbn/triggers-actions-ui-plugin/public';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import {
  EuiSpacer,
  EuiFormRow,
  EuiComboBox,
  EuiButtonGroup,
  EuiLink,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { UserConfiguredActionConnector } from '@kbn/triggers-actions-ui-plugin/public/types';
import type {
  PostBlockkitParams,
  PostMessageParams,
  SlackApiConfig,
} from '@kbn/connector-schemas/slack_api';

const SlackParamsFields: React.FunctionComponent<
  ActionParamsProps<PostMessageParams | PostBlockkitParams>
> = ({
  actionConnector,
  actionParams,
  editAction,
  index,
  errors,
  messageVariables,
  defaultMessage,
  useDefaultMessage,
}) => {
  const channelsLabelId = useGeneratedHtmlId();

  const [connectorId, setConnectorId] = useState<string>();
  const { subAction, subActionParams } = actionParams;
  const { channels = [], text, channelIds = [], channelNames = [] } = subActionParams ?? {};

  const selectedChannel = getSelectedChannel({
    channels,
    channelIds,
    channelNames,
  });

  const [messageType, setMessageType] = useState('text');
  const [textValue, setTextValue] = useState<string | undefined>(text);

  const allowedChannelsConfig =
    (actionConnector as UserConfiguredActionConnector<SlackApiConfig, unknown>)?.config
      ?.allowedChannels ?? [];

  const slackChannelsOptions = allowedChannelsConfig.map((ac) => ({
    label: formatChannel(ac.name),
    value: formatChannel(ac.name),
    'data-test-subj': ac.name,
  }));

  const hasAllowedChannelsConfig = Boolean(allowedChannelsConfig.length);

  const [selectedChannels, setSelectedChannels] = useState<EuiComboBoxOptionOption<string>[]>(
    selectedChannel ? [{ value: selectedChannel, label: selectedChannel }] : []
  );

  const onToggleInput = useCallback(
    (id: string) => {
      // clear the text when toggled
      setTextValue('');
      editAction('subAction', id === 'text' ? 'postMessage' : 'postBlockkit', index);
      setMessageType(id);
    },
    [setMessageType, editAction, index, setTextValue]
  );

  useEffect(() => {
    if (useDefaultMessage || !text) {
      editAction(
        'subActionParams',
        { channels, channelIds, channelNames, text: defaultMessage },
        index
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultMessage, useDefaultMessage]);

  useEffect(() => {
    if (subAction) {
      setMessageType(subAction === 'postMessage' ? 'text' : 'blockkit');
    }
  }, [subAction]);

  useEffect(() => {
    // Reset channel names input when we changes connector
    if (connectorId && connectorId !== actionConnector?.id) {
      editAction(
        'subActionParams',
        { channels: undefined, channelIds: undefined, channelNames: undefined, text },
        index
      );
      setSelectedChannels([]);
    }

    setConnectorId(actionConnector?.id ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionConnector?.id]);

  if (!subAction) {
    editAction('subAction', 'postMessage', index);
  }

  if (!subActionParams) {
    editAction(
      'subActionParams',
      {
        channels,
        channelIds,
        channelNames,
        text,
      },
      index
    );
  }

  const onChangeComboBox = useCallback(
    (newOptions: EuiComboBoxOptionOption<string>[]) => {
      const newSelectedChannels = newOptions.map<string>((option) => option.value!.toString());
      setSelectedChannels(newOptions);

      editAction(
        'subActionParams',
        { channels: undefined, channelIds: undefined, channelNames: newSelectedChannels, text },
        index
      );
    },
    [editAction, index, text]
  );

  const onCreateOption = useCallback(
    (searchValue: string) => {
      const normalizedSearchValue = searchValue.trim().toLowerCase();

      if (!normalizedSearchValue) {
        return;
      }

      const newOption = {
        label: searchValue,
      };

      setSelectedChannels([newOption]);

      editAction(
        'subActionParams',
        { channels: undefined, channelIds: undefined, channelNames: [newOption], text },
        index
      );
    },
    [editAction, index, text]
  );

  const onTextChange = (value: string) => {
    setTextValue(value);
    editAction('subActionParams', { channels, channelIds, channelNames, text: value }, index);
  };

  const channelInput = useMemo(() => {
    return (
      <EuiComboBox
        noSuggestions={false}
        data-test-subj="slackChannelsComboBox"
        options={hasAllowedChannelsConfig ? slackChannelsOptions : undefined}
        selectedOptions={selectedChannels}
        onChange={onChangeComboBox}
        onCreateOption={hasAllowedChannelsConfig ? undefined : onCreateOption}
        singleSelection={true}
        fullWidth={true}
        aria-labelledby="channelsLabelId"
      />
    );
  }, [
    hasAllowedChannelsConfig,
    onChangeComboBox,
    onCreateOption,
    selectedChannels,
    slackChannelsOptions,
  ]);

  return (
    <>
      <EuiFormRow
        label={i18n.translate('xpack.stackConnectors.slack.params.channelsComboBoxLabel', {
          defaultMessage: 'Channel',
        })}
        fullWidth
        error={errors.channels as string[]}
        isInvalid={Number(errors.channels?.length) > 0}
        id={channelsLabelId}
      >
        {channelInput}
      </EuiFormRow>
      <EuiSpacer size="m" />
      {actionConnector?.actionTypeId === '.slack_api' && (
        <EuiButtonGroup
          isFullWidth
          buttonSize="m"
          color="primary"
          legend=""
          options={[
            {
              id: 'text',
              label: i18n.translate('xpack.stackConnectors.slack.params.textLabel', {
                defaultMessage: 'Text',
              }),
            },
            {
              id: 'blockkit',
              label: i18n.translate('xpack.stackConnectors.slack.params.blockkitLabel', {
                defaultMessage: 'Block Kit',
              }),
            },
          ]}
          idSelected={messageType}
          onChange={onToggleInput}
          data-test-subj="slackMessageTypeChangeButton"
        />
      )}
      <EuiSpacer size="m" />
      {messageType === 'text' ? (
        <TextAreaWithMessageVariables
          index={index}
          editAction={(_: string, value: string) => {
            onTextChange(value);
          }}
          messageVariables={messageVariables}
          paramsProperty="webApiText"
          inputTargetValue={textValue}
          label={i18n.translate(
            'xpack.stackConnectors.components.slack.messageTextAreaFieldLabel',
            {
              defaultMessage: 'Message',
            }
          )}
          errors={(errors.text ?? []) as string[]}
        />
      ) : (
        <>
          <JsonEditorWithMessageVariables
            onDocumentsChange={onTextChange}
            messageVariables={messageVariables}
            paramsProperty="webApiBlock"
            inputTargetValue={textValue}
            label={i18n.translate(
              'xpack.stackConnectors.components.slack.messageJsonAreaFieldLabel',
              {
                defaultMessage: 'Block Kit',
              }
            )}
            dataTestSubj="webApiBlock"
            errors={(errors.text ?? []) as string[]}
          />
          {text && (
            <>
              <EuiSpacer size="s" />
              <EuiLink
                target="_blank"
                href={`https://app.slack.com/block-kit-builder/#${encodeURIComponent(text)}`}
                external
              >
                <FormattedMessage
                  id="xpack.stackConnectors.components.slack.viewInBlockkitBuilder"
                  defaultMessage="View in Slack Block Kit Builder"
                />
              </EuiLink>
            </>
          )}
        </>
      )}
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { SlackParamsFields as default };

const getSelectedChannel = ({
  channels,
  channelIds,
  channelNames,
}: {
  channels?: string[];
  channelIds?: string[];
  channelNames?: string[];
}) => {
  if (channelNames && channelNames.length > 0) {
    return channelNames[0];
  }

  if (channelIds && channelIds.length > 0) {
    return channelIds[0];
  }

  if (channels && channels.length > 0) {
    return channels[0];
  }

  return null;
};

const formatChannel = (channel: string): string => {
  if (channel.startsWith('#')) {
    return channel;
  }

  return `#${channel}`;
};
