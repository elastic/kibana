/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiFieldText,
  EuiFormRow,
  EuiIcon,
  EuiInMemoryTable,
  EuiLink,
  EuiPanel,
  EuiPopover,
  EuiSearchBarProps,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

import { AlertsSettingsManagement } from '../../alerts/settings/alerts_settings_management';
import { useKnowledgeBaseEntries } from '../../assistant/api/knowledge_base/entries/use_knowledge_base_entries';
import { useDeleteKnowledgeBase } from '../../assistant/api/knowledge_base/use_delete_knowledge_base';
import { useKnowledgeBaseStatus } from '../../assistant/api/knowledge_base/use_knowledge_base_status';
import { useSetupKnowledgeBase } from '../../assistant/api/knowledge_base/use_setup_knowledge_base';
import { useAssistantContext } from '../../assistant_context';
import { ESQL_RESOURCE } from '../const';
import { KnowledgeBaseToggle } from '../knowledge_base_toggle';
import * as i18n from '../translations';
import { useKnowledgeBaseResultStatus } from '../use_knowledge_base_result_status';
import { useKnowledgeBaseTable } from './use_knowledge_base_table';
import { AssistantSettingsBottomBar } from '../../assistant/settings/assistant_settings_bottom_bar';
import {
  useSettingsUpdater,
  DEFAULT_CONVERSATIONS,
  DEFAULT_PROMPTS,
} from '../../assistant/settings/use_settings_updater/use_settings_updater';
import { SETTINGS_UPDATED_TOAST_TITLE } from '../../assistant/settings/translations';
import { KnowledgeBaseSettings } from '../knowledge_base_settings';

export const KnowledgeBaseSettingsManagement: React.FC = React.memo(() => {
  const {
    assistantFeatures: { assistantKnowledgeBaseByDefault: enableKnowledgeBaseByDefault },
    http,
    toasts,
  } = useAssistantContext();
  const [hasPendingChanges, setHasPendingChanges] = useState(false);

  const { knowledgeBase, setUpdatedKnowledgeBaseSettings, resetSettings, saveSettings } =
    useSettingsUpdater(
      DEFAULT_CONVERSATIONS, // Knowledge Base settings do not require conversations
      DEFAULT_PROMPTS, // Knowledge Base settings do not require prompts
      false // Knowledge Base settings do not require conversations
    );

  const handleSave = useCallback(
    async (param?: { callback?: () => void }) => {
      await saveSettings();
      toasts?.addSuccess({
        iconType: 'check',
        title: SETTINGS_UPDATED_TOAST_TITLE,
      });
      setHasPendingChanges(false);
      param?.callback?.();
    },
    [saveSettings, toasts]
  );

  const onCancelClick = useCallback(() => {
    resetSettings();
    setHasPendingChanges(false);
  }, [resetSettings]);

  const onSaveButtonClicked = useCallback(() => {
    handleSave();
  }, [handleSave]);

  const {
    data: kbStatus,
    isLoading,
    isFetching,
  } = useKnowledgeBaseStatus({ http, resource: ESQL_RESOURCE });
  const { mutate: setupKB, isLoading: isSettingUpKB } = useSetupKnowledgeBase({ http });
  const { isLoading: isDeletingUpKB } = useDeleteKnowledgeBase({ http });
  const { data: entries } = useKnowledgeBaseEntries({ http });
  const { getColumns } = useKnowledgeBaseTable();
  const columns = useMemo(
    () =>
      getColumns({
        onEntryNameClicked: (id: string) => {},
        onSpaceNameClicked: (namespace: string) => {},
      }),
    [getColumns]
  );

  const { isLoadingKb, isSwitchDisabled } = useKnowledgeBaseResultStatus({
    enableKnowledgeBaseByDefault,
    kbStatus,
    knowledgeBase,
    isLoading,
    isFetching,
    isSettingUpKB,
    isDeletingUpKB,
  });
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const closePopover = () => setIsPopoverOpen(false);

  const button = useMemo(
    () => (
      <EuiButton iconType="arrowDown" iconSide="right" fill>
        <EuiIcon type="plusInCircle" />
        {i18n.ENTRY}
      </EuiButton>
    ),
    []
  );
  const renderToolsRight = useCallback(() => {
    return (
      <EuiPopover
        initialFocus="#name"
        button={button}
        isOpen={isPopoverOpen}
        closePopover={closePopover}
      >
        <EuiFormRow label="Enter name" id="name">
          <EuiFieldText compressed name="input" />
        </EuiFormRow>
      </EuiPopover>
    );
  }, [button, isPopoverOpen]);

  const search: EuiSearchBarProps = useMemo(
    () => ({
      toolsRight: renderToolsRight(),
      box: {
        incremental: true,
      },
      filters: [
        {
          type: 'field_value_selection',
          field: 'namespace',
          name: 'Spaces',
          multiSelect: false,
          options: entries.data.map(({ namespace }) => ({
            value: namespace,
          })),
        },
      ],
    }),
    [entries.data, renderToolsRight]
  );

  if (!enableKnowledgeBaseByDefault) {
    return (
      <KnowledgeBaseSettings
        knowledgeBase={knowledgeBase}
        setUpdatedKnowledgeBaseSettings={setUpdatedKnowledgeBaseSettings}
      />
    );
  }

  return (
    <>
      <EuiPanel hasShadow={false} hasBorder paddingSize="l">
        <KnowledgeBaseToggle
          compressed={false}
          enableKnowledgeBaseByDefault={enableKnowledgeBaseByDefault}
          isEnabledKnowledgeBase={knowledgeBase.isEnabledKnowledgeBase}
          isLoadingKb={isLoadingKb}
          isSwitchDisabled={isSwitchDisabled}
          kbStatusElserExists={kbStatus?.elser_exists ?? false}
          knowledgeBase={knowledgeBase}
          setUpdatedKnowledgeBaseSettings={setUpdatedKnowledgeBaseSettings}
          setupKB={setupKB}
          showLabel={true}
        />
        <EuiSpacer size="m" />
        <EuiText size={'m'}>
          <FormattedMessage
            id="xpack.elasticAssistant.assistant.settings.knowledgeBasedSettingManagements.knowledgeBaseDescription"
            defaultMessage="Powered by ELSER, the knowledge base enables the AI Assistant to recall documents and other relevant context within your conversation. For more information about user access refer to our {documentation}."
            values={{
              documentation: (
                <EuiLink
                  external
                  href="https://www.elastic.co/guide/en/security/current/security-assistant.html"
                  target="_blank"
                >
                  {i18n.KNOWLEDGE_BASE_DOCUMENTATION}
                </EuiLink>
              ),
            }}
          />
        </EuiText>
        <EuiSpacer size="l" />
        <EuiInMemoryTable columns={columns} items={entries.data ?? []} search={search} />
      </EuiPanel>
      <EuiSpacer size="m" />
      <AlertsSettingsManagement
        knowledgeBase={knowledgeBase}
        setUpdatedKnowledgeBaseSettings={setUpdatedKnowledgeBaseSettings}
      />
      <AssistantSettingsBottomBar
        hasPendingChanges={hasPendingChanges}
        onCancelClick={onCancelClick}
        onSaveButtonClicked={onSaveButtonClicked}
      />
    </>
  );
});

KnowledgeBaseSettingsManagement.displayName = 'KnowledgeBaseSettingsManagement';
