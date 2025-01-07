/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import {
  EuiFormRow,
  EuiTitle,
  EuiText,
  EuiHorizontalRule,
  EuiSpacer,
  EuiBetaBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiButtonEmpty,
  EuiLink,
  EuiToolTip,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';

import { AlertsSettings } from '../assistant/settings/alerts_settings/alerts_settings';
import { useAssistantContext } from '../assistant_context';
import type { KnowledgeBaseConfig } from '../assistant/types';
import * as i18n from './translations';
import { useKnowledgeBaseStatus } from '../assistant/api/knowledge_base/use_knowledge_base_status';
import { useSetupKnowledgeBase } from '../assistant/api/knowledge_base/use_setup_knowledge_base';
import { SETUP_KNOWLEDGE_BASE_BUTTON_TOOLTIP } from './translations';

const KNOWLEDGE_BASE_INDEX_PATTERN = '.kibana-elastic-ai-assistant-knowledge-base-(SPACE)';

interface Props {
  knowledgeBase: KnowledgeBaseConfig;
  setUpdatedKnowledgeBaseSettings: React.Dispatch<React.SetStateAction<KnowledgeBaseConfig>>;
  modalMode?: boolean;
}

/**
 * Knowledge Base Settings -- set up the Knowledge Base and configure RAG on alerts
 */
export const KnowledgeBaseSettings: React.FC<Props> = React.memo(
  ({ knowledgeBase, setUpdatedKnowledgeBaseSettings, modalMode = false }) => {
    const {
      http,
      toasts,
      assistantAvailability: { isAssistantEnabled },
    } = useAssistantContext();
    const {
      data: kbStatus,
      isLoading,
      isFetching,
    } = useKnowledgeBaseStatus({ http, enabled: isAssistantEnabled });
    const { mutate: setupKB, isLoading: isSettingUpKB } = useSetupKnowledgeBase({ http, toasts });

    // Resource enabled state
    const isElserEnabled = kbStatus?.elser_exists ?? false;
    const isSecurityLabsEnabled = kbStatus?.security_labs_exists ?? false;
    const isKnowledgeBaseSetup =
      (isElserEnabled &&
        kbStatus?.index_exists &&
        kbStatus?.pipeline_exists &&
        (isSecurityLabsEnabled || kbStatus?.user_data_exists)) ??
      false;
    const isSetupInProgress = kbStatus?.is_setup_in_progress ?? false;
    const isSetupAvailable = kbStatus?.is_setup_available ?? false;

    // Resource availability state
    const isLoadingKb = isLoading || isFetching || isSettingUpKB || isSetupInProgress;

    // Calculated health state for EuiHealth component
    const elserHealth = isElserEnabled ? 'success' : 'subdued';
    const knowledgeBaseHealth = isKnowledgeBaseSetup ? 'success' : 'subdued';

    //////////////////////////////////////////////////////////////////////////////////////////
    // Main `Knowledge Base` setup button
    const onSetupKnowledgeBaseButtonClick = useCallback(() => {
      setupKB();
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

    return (
      <>
        <EuiTitle size={'s'} data-test-subj="knowledge-base-settings">
          <h2>
            {i18n.SETTINGS_TITLE}{' '}
            <EuiBetaBadge iconType={'beaker'} label={i18n.SETTINGS_BADGE} size="s" color="hollow" />
          </h2>
        </EuiTitle>
        <EuiSpacer size="xs" />
        <EuiText size={'s'}>
          <FormattedMessage
            id="xpack.elasticAssistant.assistant.settings.knowledgeBasedSetting.knowledgeBaseDescription"
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
          display="columnCompressed"
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
                  id="xpack.elasticAssistant.assistant.settings.knowledgeBasedSettings.knowledgeBaseDescription"
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
        </EuiFlexGroup>

        <EuiSpacer size="s" />

        {!modalMode && (
          <AlertsSettings
            knowledgeBase={knowledgeBase}
            setUpdatedKnowledgeBaseSettings={setUpdatedKnowledgeBaseSettings}
          />
        )}
      </>
    );
  }
);

KnowledgeBaseSettings.displayName = 'KnowledgeBaseSettings';
