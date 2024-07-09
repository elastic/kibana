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
  EuiLink,
  EuiBetaBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiButtonEmpty,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';

import { AlertsSettings } from '../alerts/settings/alerts_settings';
import { useAssistantContext } from '../assistant_context';
import type { KnowledgeBaseConfig } from '../assistant/types';
import * as i18n from './translations';
import { useDeleteKnowledgeBase } from '../assistant/api/knowledge_base/use_delete_knowledge_base';
import { useKnowledgeBaseStatus } from '../assistant/api/knowledge_base/use_knowledge_base_status';
import { useSetupKnowledgeBase } from '../assistant/api/knowledge_base/use_setup_knowledge_base';
import { KnowledgeBaseToggle } from './knowledge_base_toggle';
import {
  ESQL_RESOURCE,
  KNOWLEDGE_BASE_INDEX_PATTERN,
  KNOWLEDGE_BASE_INDEX_PATTERN_OLD,
} from './const';
import { useKnowledgeBaseResultStatus } from './use_knowledge_base_result_status';

interface Props {
  knowledgeBase: KnowledgeBaseConfig;
  setUpdatedKnowledgeBaseSettings: React.Dispatch<React.SetStateAction<KnowledgeBaseConfig>>;
}

/**
 * Knowledge Base Settings -- enable and disable LangChain integration, Knowledge Base, and ESQL KB Documents
 */
export const KnowledgeBaseSettings: React.FC<Props> = React.memo(
  ({ knowledgeBase, setUpdatedKnowledgeBaseSettings }) => {
    const {
      assistantFeatures: { assistantKnowledgeBaseByDefault: enableKnowledgeBaseByDefault },
      http,
    } = useAssistantContext();
    const {
      data: kbStatus,
      isLoading,
      isFetching,
    } = useKnowledgeBaseStatus({ http, resource: ESQL_RESOURCE });
    const { mutate: setupKB, isLoading: isSettingUpKB } = useSetupKnowledgeBase({ http });
    const { mutate: deleteKB, isLoading: isDeletingUpKB } = useDeleteKnowledgeBase({ http });

    const {
      isElserEnabled,
      isKnowledgeBaseEnabled,
      isESQLEnabled,
      isLoadingKb,
      isKnowledgeBaseAvailable,
      isESQLAvailable,
      isSwitchDisabled,
    } = useKnowledgeBaseResultStatus({
      enableKnowledgeBaseByDefault,
      kbStatus,
      knowledgeBase,
      isLoading,
      isFetching,
      isSettingUpKB,
      isDeletingUpKB,
    });

    // Calculated health state for EuiHealth component
    const elserHealth = isElserEnabled ? 'success' : 'subdued';
    const knowledgeBaseHealth = isKnowledgeBaseEnabled ? 'success' : 'subdued';
    const esqlHealth = isESQLEnabled ? 'success' : 'subdued';

    //////////////////////////////////////////////////////////////////////////////////////////
    // Knowledge Base Resource
    const onEnableKB = useCallback(
      (enabled: boolean) => {
        if (enabled) {
          setupKB();
        } else {
          deleteKB();
        }
      },
      [deleteKB, setupKB]
    );

    const knowledgeBaseActionButton = useMemo(() => {
      return isLoadingKb || !isKnowledgeBaseAvailable ? (
        <></>
      ) : (
        <EuiButtonEmpty
          color={isKnowledgeBaseEnabled ? 'danger' : 'primary'}
          flush="left"
          data-test-subj={'knowledgeBaseActionButton'}
          onClick={() => onEnableKB(!isKnowledgeBaseEnabled)}
          size="xs"
        >
          {isKnowledgeBaseEnabled
            ? i18n.KNOWLEDGE_BASE_DELETE_BUTTON
            : i18n.KNOWLEDGE_BASE_INIT_BUTTON}
        </EuiButtonEmpty>
      );
    }, [isKnowledgeBaseAvailable, isKnowledgeBaseEnabled, isLoadingKb, onEnableKB]);

    const knowledgeBaseDescription = useMemo(() => {
      return isKnowledgeBaseEnabled ? (
        <span data-test-subj="kb-installed">
          {i18n.KNOWLEDGE_BASE_DESCRIPTION_INSTALLED(
            enableKnowledgeBaseByDefault
              ? KNOWLEDGE_BASE_INDEX_PATTERN
              : KNOWLEDGE_BASE_INDEX_PATTERN_OLD
          )}{' '}
          {knowledgeBaseActionButton}
        </span>
      ) : (
        <span data-test-subj="install-kb">
          {i18n.KNOWLEDGE_BASE_DESCRIPTION} {knowledgeBaseActionButton}
        </span>
      );
    }, [enableKnowledgeBaseByDefault, isKnowledgeBaseEnabled, knowledgeBaseActionButton]);

    //////////////////////////////////////////////////////////////////////////////////////////
    // ESQL Resource
    const onEnableESQL = useCallback(
      (enabled: boolean) => {
        if (enabled) {
          setupKB(ESQL_RESOURCE);
        } else {
          deleteKB(ESQL_RESOURCE);
        }
      },
      [deleteKB, setupKB]
    );

    const esqlActionButton = useMemo(() => {
      return isLoadingKb || !isESQLAvailable ? (
        <></>
      ) : (
        <EuiButtonEmpty
          color={isESQLEnabled ? 'danger' : 'primary'}
          flush="left"
          data-test-subj="esqlEnableButton"
          onClick={() => onEnableESQL(!isESQLEnabled)}
          size="xs"
        >
          {isESQLEnabled ? i18n.KNOWLEDGE_BASE_DELETE_BUTTON : i18n.KNOWLEDGE_BASE_INIT_BUTTON}
        </EuiButtonEmpty>
      );
    }, [isLoadingKb, isESQLAvailable, isESQLEnabled, onEnableESQL]);

    const esqlDescription = useMemo(() => {
      return isESQLEnabled ? (
        <span data-test-subj="esql-installed">
          {i18n.ESQL_DESCRIPTION_INSTALLED} {esqlActionButton}
        </span>
      ) : (
        <span data-test-subj="install-esql">
          {i18n.ESQL_DESCRIPTION} {esqlActionButton}
        </span>
      );
    }, [esqlActionButton, isESQLEnabled]);

    return (
      <>
        <EuiTitle size={'s'}>
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
          display="columnCompressedSwitch"
          label={i18n.KNOWLEDGE_BASE_LABEL}
          css={css`
            .euiFormRow__labelWrapper {
              min-width: 95px !important;
            }
          `}
        >
          <KnowledgeBaseToggle
            compressed={true}
            enableKnowledgeBaseByDefault={enableKnowledgeBaseByDefault}
            isEnabledKnowledgeBase={knowledgeBase.isEnabledKnowledgeBase}
            isLoadingKb={isLoadingKb}
            isSwitchDisabled={isSwitchDisabled}
            kbStatusElserExists={kbStatus?.elser_exists ?? false}
            knowledgeBase={knowledgeBase}
            setUpdatedKnowledgeBaseSettings={setUpdatedKnowledgeBaseSettings}
            setupKB={setupKB}
            showLabel={false}
          />
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
                  defaultMessage="Configure ELSER within {machineLearning} to get started. {seeDocs}"
                  id="xpack.elasticAssistant.assistant.settings.knowledgeBasedSettings.knowledgeBaseDescription"
                  values={{
                    machineLearning: (
                      <EuiLink
                        external
                        href={http.basePath.prepend('/app/ml/trained_models')}
                        target="_blank"
                      >
                        {i18n.KNOWLEDGE_BASE_ELSER_MACHINE_LEARNING}
                      </EuiLink>
                    ),
                    seeDocs: (
                      <EuiLink
                        external
                        href={
                          'https://www.elastic.co/guide/en/machine-learning/current/ml-nlp-elser.html#download-deploy-elser'
                        }
                        target="_blank"
                      >
                        {i18n.KNOWLEDGE_BASE_ELSER_SEE_DOCS}
                      </EuiLink>
                    ),
                  }}
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
          setUpdatedKnowledgeBaseSettings={setUpdatedKnowledgeBaseSettings}
        />
      </>
    );
  }
);

KnowledgeBaseSettings.displayName = 'KnowledgeBaseSettings';
