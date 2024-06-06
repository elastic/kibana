/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiInMemoryTable,
  EuiPanel,
  EuiSpacer,
  EuiBadge,
  EuiLink,
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiFormRow,
  EuiBasicTableColumn,
  EuiTitle,
  EuiFlyoutFooter,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiButton,
} from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';

import { ActionTypeRegistryContract } from '@kbn/triggers-actions-ui-plugin/public';
import { FormattedMessage } from '@kbn/i18n-react';
import { noop } from 'lodash/fp';
import { Conversation } from '../../../assistant_context/types';
import {
  ConversationTableItem,
  useConversationSelectorSettings,
} from '../conversation_selector_settings/use_conversation_selector_settings';
import { ConversationStreamingSwitch } from '../conversation_settings/conversation_streaming_switch';
import { AIConnector, ConnectorSelector } from '../../../connectorland/connector_selector';
import { FormattedDate } from '../../common/components/formatted_date';
import { RowActions } from '../../common/components/row_actions';
import {
  CONVERSATIONS_TABLE_COLUMN_ACTIONS,
  CONVERSATIONS_TABLE_COLUMN_CONNECTOR,
  CONVERSATIONS_TABLE_COLUMN_SYSTEM_PROMPT,
  CONVERSATIONS_TABLE_COLUMN_TYPE,
  CONVERSATIONS_TABLE_COLUMN_UPDATED_AT,
} from './translations';
import { SelectSystemPrompt } from '../../prompt_editor/system_prompt/select_system_prompt';
import {
  CONNECTOR_TITLE,
  SETTINGS_PROMPT_HELP_TEXT_TITLE,
  SETTINGS_PROMPT_TITLE,
} from '../conversation_settings/translations';
import { Prompt } from '../../types';
import { useSelectSystemPrompt } from '../conversation_settings/use_select_system_prompt';
import { useConnectorSelector } from '../conversation_settings/use_connector_selector';
import { ConversationsBulkActions } from '../../api';
import { useAssistantContext } from '../../../assistant_context';
import { CANCEL, SAVE } from '../../settings/translations';
import { useConversationDeleted } from '../conversation_settings/use_conversation_deleted';

interface Props {
  actionTypeRegistry: ActionTypeRegistryContract;
  allSystemPrompts: Prompt[];
  areConnectorsFetched: boolean;
  assistantStreamingEnabled: boolean;
  connectors: AIConnector[] | undefined;
  conversations: Record<string, Conversation>;
  conversationSettings: Record<string, Conversation>;
  conversationsSettingsBulkActions: ConversationsBulkActions;
  handleSave: () => void;
  isDisabled?: boolean;
  isFlyoutMode: boolean;
  resetSettings: () => void;
  setAssistantStreamingEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  setConversationSettings: React.Dispatch<React.SetStateAction<Record<string, Conversation>>>;
  setConversationsSettingsBulkActions: React.Dispatch<
    React.SetStateAction<ConversationsBulkActions>
  >;
}

const ConversationSettingsManagementComponent: React.FC<Props> = ({
  actionTypeRegistry,
  allSystemPrompts,
  areConnectorsFetched,
  assistantStreamingEnabled,
  connectors,
  conversations,
  conversationSettings,
  conversationsSettingsBulkActions,
  handleSave,
  isDisabled,
  isFlyoutMode,
  resetSettings,
  setAssistantStreamingEnabled,
  setConversationSettings,
  setConversationsSettingsBulkActions,
}) => {
  const { http } = useAssistantContext();
  const [editFlyoutVisible, setEditFlyoutVisibility] = useState<boolean>(false);
  const [selectedConversation, setSelectedConversation] = useState<
    ConversationTableItem | undefined
  >(undefined);

  const selectedConnector = useMemo(() => {
    const selectedConnectorId = selectedConversation?.apiConfig?.connectorId;
    if (areConnectorsFetched) {
      return connectors?.find((c) => c.id === selectedConnectorId);
    }
    return undefined;
  }, [areConnectorsFetched, connectors, selectedConversation?.apiConfig?.connectorId]);

  const selectedConversationTitle = selectedConversation?.title ?? '';

  const handleConversationEdited = useCallback((rowItem: ConversationTableItem) => {
    setEditFlyoutVisibility(true);
    setSelectedConversation(rowItem);
  }, []);

  const onConversationDeleted = useConversationDeleted({
    conversationSettings,
    conversationsSettingsBulkActions,
    setConversationSettings,
    setConversationsSettingsBulkActions,
  });

  const handleConversationDeleted = useCallback(() => {
    onConversationDeleted(selectedConversationTitle);
  }, [onConversationDeleted, selectedConversationTitle]);

  const conversationOptions = useConversationSelectorSettings({
    allSystemPrompts,
    actionTypeRegistry,
    connectors,
    conversations,
  });

  const { selectedSystemPrompt, handleOnSystemPromptSelectionChange } = useSelectSystemPrompt({
    allSystemPrompts,
    conversationSettings,
    conversationsSettingsBulkActions,
    selectedConversation,
    setConversationSettings,
    setConversationsSettingsBulkActions,
  });

  const handleOnConnectorSelectionChange = useConnectorSelector({
    selectedConversation,
    setConversationSettings,
    conversationSettings,
    setConversationsSettingsBulkActions,
    conversationsSettingsBulkActions,
  });

  const columns: Array<EuiBasicTableColumn<ConversationTableItem>> = [
    {
      name: CONVERSATIONS_TABLE_COLUMN_TYPE,
      render: (conversation: ConversationTableItem) => (
        <EuiLink onClick={() => handleConversationEdited(conversation)}>
          {conversation.title}
        </EuiLink>
      ),
    },
    {
      field: 'systemPrompt',
      name: CONVERSATIONS_TABLE_COLUMN_SYSTEM_PROMPT,
      render: (systemPrompt: ConversationTableItem['systemPrompt']) =>
        systemPrompt ? <EuiBadge color="hollow">{systemPrompt}</EuiBadge> : null,
    },
    {
      field: 'actionType',
      name: CONVERSATIONS_TABLE_COLUMN_CONNECTOR,
      render: (actionType: ConversationTableItem['actionType']) =>
        actionType ? <EuiBadge color="hollow">{actionType}</EuiBadge> : null,
    },
    {
      field: 'updatedAt',
      name: CONVERSATIONS_TABLE_COLUMN_UPDATED_AT,
      render: (updatedAt: ConversationTableItem['updatedAt']) =>
        updatedAt ? (
          <EuiBadge color="hollow">
            <FormattedDate value={new Date(updatedAt)} dateFormat="DD/MM/YYYY" />
          </EuiBadge>
        ) : null,
    },
    {
      name: CONVERSATIONS_TABLE_COLUMN_ACTIONS,
      actions: [
        {
          name: CONVERSATIONS_TABLE_COLUMN_ACTIONS,
          render: (conversation: ConversationTableItem) => {
            return (
              <RowActions<ConversationTableItem>
                rowItem={conversation}
                onEdit={handleConversationEdited}
                onDelete={handleConversationDeleted}
              />
            );
          },
        },
      ],
    },
  ];

  const onCancelClick = useCallback(() => {
    setEditFlyoutVisibility(false);
    resetSettings();
  }, [resetSettings]);

  const onSaveClick = useCallback(() => {
    handleSave();
    setEditFlyoutVisibility(false);
  }, [handleSave]);
  return (
    <>
      <EuiPanel hasShadow={false} hasBorder paddingSize="l">
        <ConversationStreamingSwitch
          assistantStreamingEnabled={assistantStreamingEnabled}
          setAssistantStreamingEnabled={setAssistantStreamingEnabled}
          compressed={false}
        />
        <EuiSpacer size="m" />
        <EuiInMemoryTable items={conversationOptions} columns={columns} pagination={true} />
      </EuiPanel>
      {editFlyoutVisible && (
        <EuiFlyout ownFocus onClose={() => setEditFlyoutVisibility(false)}>
          <EuiFlyoutHeader hasBorder>
            <EuiTitle size="s">
              <h2>{selectedConversationTitle}</h2>
            </EuiTitle>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            <EuiFormRow
              data-test-subj="prompt-field"
              display="rowCompressed"
              fullWidth
              label={SETTINGS_PROMPT_TITLE}
              helpText={SETTINGS_PROMPT_HELP_TEXT_TITLE}
            >
              <SelectSystemPrompt
                allSystemPrompts={allSystemPrompts}
                compressed
                conversation={selectedConversation}
                isEditing={true}
                isDisabled={isDisabled}
                onSystemPromptSelectionChange={handleOnSystemPromptSelectionChange}
                selectedPrompt={selectedSystemPrompt}
                showTitles={true}
                isSettingsModalVisible={true}
                setIsSettingsModalVisible={noop} // noop, already in settings
                isFlyoutMode={isFlyoutMode}
              />
            </EuiFormRow>
            <EuiFormRow
              data-test-subj="connector-field"
              display="rowCompressed"
              label={CONNECTOR_TITLE}
              helpText={
                <EuiLink
                  href={`${http.basePath.get()}/app/management/insightsAndAlerting/triggersActionsConnectors/connectors`}
                  target="_blank"
                  external
                >
                  <FormattedMessage
                    id="xpack.elasticAssistant.assistant.settings.connectorHelpTextTitle"
                    defaultMessage="Kibana Connector to make requests with"
                  />
                </EuiLink>
              }
            >
              <ConnectorSelector
                isDisabled={isDisabled}
                onConnectorSelectionChange={handleOnConnectorSelectionChange}
                selectedConnectorId={selectedConnector?.id}
                isFlyoutMode={isFlyoutMode}
              />
            </EuiFormRow>
          </EuiFlyoutBody>
          <EuiFlyoutFooter>
            <EuiFlexGroup justifyContent="spaceBetween" gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  size="s"
                  color="text"
                  iconType="cross"
                  data-test-subj="cancel-button"
                  onClick={onCancelClick}
                >
                  {CANCEL}
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  size="s"
                  type="submit"
                  data-test-subj="save-button"
                  onClick={onSaveClick}
                  iconType="check"
                  fill
                >
                  {SAVE}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlyoutFooter>
        </EuiFlyout>
      )}
    </>
  );
};

export const ConversationSettingsManagement = React.memo(ConversationSettingsManagementComponent);

ConversationSettingsManagement.displayName = 'ConversationSettingsManagement';
