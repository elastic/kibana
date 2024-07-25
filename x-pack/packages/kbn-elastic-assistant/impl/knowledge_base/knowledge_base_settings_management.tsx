/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiFormRow,
  EuiText,
  EuiHorizontalRule,
  EuiSpacer,
  EuiLink,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiButtonEmpty,
  EuiPanel,
  EuiToolTip,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';

import { AlertsSettings } from '../alerts/settings/alerts_settings';
import { useAssistantContext } from '../assistant_context';
import * as i18n from './translations';
import { useKnowledgeBaseStatus } from '../assistant/api/knowledge_base/use_knowledge_base_status';
import { useSetupKnowledgeBase } from '../assistant/api/knowledge_base/use_setup_knowledge_base';
import {
  useSettingsUpdater,
  DEFAULT_CONVERSATIONS,
  DEFAULT_PROMPTS,
} from '../assistant/settings/use_settings_updater/use_settings_updater';
import { AssistantSettingsBottomBar } from '../assistant/settings/assistant_settings_bottom_bar';
import { SETTINGS_UPDATED_TOAST_TITLE } from '../assistant/settings/translations';
import { SETUP_KNOWLEDGE_BASE_BUTTON_TOOLTIP } from './translations';

const ESQL_RESOURCE = 'esql';
const KNOWLEDGE_BASE_INDEX_PATTERN = '.kibana-elastic-ai-assistant-knowledge-base-(SPACE)';

/**
 * Knowledge Base Settings -- set up the Knowledge Base and configure RAG on alerts
 */
export const KnowledgeBaseSettingsManagement: React.FC = React.memo(() => {
  const { http, toasts } = useAssistantContext();
  const [hasPendingChanges, setHasPendingChanges] = useState(false);

  const { knowledgeBase, setUpdatedKnowledgeBaseSettings, resetSettings, saveSettings } =
    useSettingsUpdater(
      DEFAULT_CONVERSATIONS, // Knowledge Base settings do not require conversations
      DEFAULT_PROMPTS, // Knowledge Base settings do not require prompts
      false, // Knowledge Base settings do not require prompts
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

  const handleUpdateKnowledgeBaseSettings = useCallback(
    (updatedKnowledgebase) => {
      setHasPendingChanges(true);
      setUpdatedKnowledgeBaseSettings(updatedKnowledgebase);
    },
    [setUpdatedKnowledgeBaseSettings]
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
  const { mutate: setupKB, isLoading: isSettingUpKB } = useSetupKnowledgeBase({ http, toasts });

  // Resource enabled state
  const isElserEnabled = kbStatus?.elser_exists ?? false;
  const isESQLEnabled = kbStatus?.esql_exists ?? false;
  const isKnowledgeBaseSetup =
    (isElserEnabled && isESQLEnabled && kbStatus?.index_exists && kbStatus?.pipeline_exists) ??
    false;
  const isSetupInProgress = kbStatus?.is_setup_in_progress ?? false;
  const isSetupAvailable = kbStatus?.is_setup_available ?? false;

  // Resource availability state
  const isLoadingKb = isLoading || isFetching || isSettingUpKB || isSetupInProgress;

  // Calculated health state for EuiHealth component
  const elserHealth = isElserEnabled ? 'success' : 'subdued';
  const knowledgeBaseHealth = isKnowledgeBaseSetup ? 'success' : 'subdued';
  const esqlHealth = isESQLEnabled ? 'success' : 'subdued';

  //////////////////////////////////////////////////////////////////////////////////////////
  // Main `Knowledge Base` setup button
  const onSetupKnowledgeBaseButtonClick = useCallback(() => {
    setupKB(ESQL_RESOURCE);
  }, [setupKB]);

  const toolTipContent = !isSetupAvailable ? SETUP_KNOWLEDGE_BASE_BUTTON_TOOLTIP : undefined;

  const setupKnowledgeBaseButton = useMemo(() => {
    return isKnowledgeBaseSetup ? (
      <></>
    ) : (
      <EuiToolTip position={'bottom'} content={toolTipContent}>
        <EuiButtonEmpty
          color={'primary'}
          data-test-subj={'setupKnowledgeBaseButton'}
          disabled={!isSetupAvailable}
          onClick={onSetupKnowledgeBaseButtonClick}
          size="xs"
          isLoading={isLoadingKb}
        >
          {i18n.SETUP_KNOWLEDGE_BASE_BUTTON}
        </EuiButtonEmpty>
      </EuiToolTip>
    );
  }, [
    isKnowledgeBaseSetup,
    isLoadingKb,
    isSetupAvailable,
    onSetupKnowledgeBaseButtonClick,
    toolTipContent,
  ]);

  //////////////////////////////////////////////////////////////////////////////////////////
  // Knowledge Base Resource
  const knowledgeBaseDescription = useMemo(() => {
    return isKnowledgeBaseSetup ? (
      <span data-test-subj="kb-installed">
        {i18n.KNOWLEDGE_BASE_DESCRIPTION_INSTALLED(KNOWLEDGE_BASE_INDEX_PATTERN)}
      </span>
    ) : (
      <span data-test-subj="install-kb">{i18n.KNOWLEDGE_BASE_DESCRIPTION}</span>
    );
  }, [isKnowledgeBaseSetup]);

  //////////////////////////////////////////////////////////////////////////////////////////
  // ESQL Resource

  const esqlDescription = useMemo(() => {
    return isESQLEnabled ? (
      <span data-test-subj="esql-installed">{i18n.ESQL_DESCRIPTION_INSTALLED}</span>
    ) : (
      <span data-test-subj="install-esql">{i18n.ESQL_DESCRIPTION}</span>
    );
  }, [isESQLEnabled]);

  return (
    <EuiPanel hasShadow={false} hasBorder paddingSize="l">
      <EuiText size="m">
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
      <EuiHorizontalRule margin={'s'} />

      <EuiFormRow
        display="columnCompressedSwitch"
        label={i18n.KNOWLEDGE_BASE_LABEL}
        css={css`
          .euiFormRow__labelWrapper {
            min-width: 95px !important;
          }
        `}
      >
        {setupKnowledgeBaseButton}
      </EuiFormRow>
      <EuiSpacer size="s" />

      <EuiFlexGroup
        direction={'column'}
        gutterSize={'s'}
        css={css`
          padding-left: 5px;
        `}
      >
        <EuiFlexItem grow={false}>
          <div>
            <EuiHealth color={elserHealth}>{i18n.KNOWLEDGE_BASE_ELSER_LABEL}</EuiHealth>
            <EuiText
              size={'xs'}
              color={'subdued'}
              css={css`
                padding-left: 20px;
              `}
            >
              <FormattedMessage
                defaultMessage="Elastic Learned Sparse EncodeR - or ELSER - is a retrieval model trained by Elastic for performing semantic search."
                id="xpack.elasticAssistant.assistant.settings.knowledgeBasedSettingsManagement.knowledgeBaseDescription"
              />
            </EuiText>
          </div>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <div>
            <EuiHealth color={knowledgeBaseHealth}>{i18n.KNOWLEDGE_BASE_LABEL}</EuiHealth>
            <EuiText
              size={'xs'}
              color={'subdued'}
              css={css`
                padding-left: 20px;
              `}
            >
              {knowledgeBaseDescription}
            </EuiText>
          </div>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <span>
            <EuiHealth color={esqlHealth}>{i18n.ESQL_LABEL}</EuiHealth>
            <EuiText
              size={'xs'}
              color={'subdued'}
              css={css`
                padding-left: 20px;
              `}
            >
              {esqlDescription}
            </EuiText>
          </span>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="s" />

      <AlertsSettings
        knowledgeBase={knowledgeBase}
        setUpdatedKnowledgeBaseSettings={handleUpdateKnowledgeBaseSettings}
      />

      <AssistantSettingsBottomBar
        hasPendingChanges={hasPendingChanges}
        onCancelClick={onCancelClick}
        onSaveButtonClicked={onSaveButtonClicked}
      />
    </EuiPanel>
  );
});

KnowledgeBaseSettingsManagement.displayName = 'KnowledgeBaseSettingsManagement';
