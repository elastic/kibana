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
  EuiLoadingSpinner,
  EuiSpacer,
  EuiSwitchEvent,
  EuiLink,
  EuiBetaBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiButtonEmpty,
  EuiToolTip,
  EuiSwitch,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';

import { AlertsSettings } from '../alerts/settings/alerts_settings';
import { useAssistantContext } from '../assistant_context';
import type { KnowledgeBaseConfig } from '../assistant/types';
import * as i18n from './translations';
import { useDeleteKnowledgeBase } from './use_delete_knowledge_base';
import { useKnowledgeBaseStatus } from './use_knowledge_base_status';
import { useSetupKnowledgeBase } from './use_setup_knowledge_base';

const ESQL_RESOURCE = 'esql';
const KNOWLEDGE_BASE_INDEX_PATTERN = '.kibana-elastic-ai-assistant-kb';

interface Props {
  knowledgeBase: KnowledgeBaseConfig;
  setUpdatedKnowledgeBaseSettings: React.Dispatch<React.SetStateAction<KnowledgeBaseConfig>>;
}

/**
 * Knowledge Base Settings -- enable and disable LangChain integration, Knowledge Base, and ESQL KB Documents
 */
export const KnowledgeBaseSettings: React.FC<Props> = React.memo(
  ({ knowledgeBase, setUpdatedKnowledgeBaseSettings }) => {
    const { http } = useAssistantContext();
    const {
      data: kbStatus,
      isLoading,
      isFetching,
    } = useKnowledgeBaseStatus({ http, resource: ESQL_RESOURCE });
    const { mutate: setupKB, isLoading: isSettingUpKB } = useSetupKnowledgeBase({ http });
    const { mutate: deleteKB, isLoading: isDeletingUpKB } = useDeleteKnowledgeBase({ http });

    // Resource enabled state
    const isElserEnabled = kbStatus?.elser_exists ?? false;
    const isKnowledgeBaseEnabled = (kbStatus?.index_exists && kbStatus?.pipeline_exists) ?? false;
    const isESQLEnabled = kbStatus?.esql_exists ?? false;

    // Resource availability state
    const isLoadingKb = isLoading || isFetching || isSettingUpKB || isDeletingUpKB;
    const isKnowledgeBaseAvailable = knowledgeBase.isEnabledKnowledgeBase && kbStatus?.elser_exists;
    const isESQLAvailable =
      knowledgeBase.isEnabledKnowledgeBase && isKnowledgeBaseAvailable && isKnowledgeBaseEnabled;
    // Prevent enabling if elser doesn't exist, but always allow to disable
    const isSwitchDisabled = !kbStatus?.elser_exists && !knowledgeBase.isEnabledKnowledgeBase;

    // Calculated health state for EuiHealth component
    const elserHealth = isElserEnabled ? 'success' : 'subdued';
    const knowledgeBaseHealth = isKnowledgeBaseEnabled ? 'success' : 'subdued';
    const esqlHealth = isESQLEnabled ? 'success' : 'subdued';

    //////////////////////////////////////////////////////////////////////////////////////////
    // Main `Knowledge Base` switch, which toggles the `isEnabledKnowledgeBase` UI feature toggle
    // setting that is saved to localstorage
    const onEnableAssistantLangChainChange = useCallback(
      (event: EuiSwitchEvent) => {
        setUpdatedKnowledgeBaseSettings({
          ...knowledgeBase,
          isEnabledKnowledgeBase: event.target.checked,
        });

        // If enabling and ELSER exists, try to set up automatically
        if (event.target.checked && kbStatus?.elser_exists) {
          setupKB(ESQL_RESOURCE);
        }
      },
      [kbStatus?.elser_exists, knowledgeBase, setUpdatedKnowledgeBaseSettings, setupKB]
    );

    const isEnabledKnowledgeBaseSwitch = useMemo(() => {
      return isLoadingKb ? (
        <EuiLoadingSpinner size="s" />
      ) : (
        <EuiToolTip content={isSwitchDisabled && i18n.KNOWLEDGE_BASE_TOOLTIP} position={'right'}>
          <EuiSwitch
            showLabel={false}
            data-test-subj="isEnabledKnowledgeBaseSwitch"
            disabled={isSwitchDisabled}
            checked={knowledgeBase.isEnabledKnowledgeBase}
            onChange={onEnableAssistantLangChainChange}
            label={i18n.KNOWLEDGE_BASE_LABEL}
            compressed
          />
        </EuiToolTip>
      );
    }, [
      isLoadingKb,
      isSwitchDisabled,
      knowledgeBase.isEnabledKnowledgeBase,
      onEnableAssistantLangChainChange,
    ]);

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
          {i18n.KNOWLEDGE_BASE_DESCRIPTION_INSTALLED(KNOWLEDGE_BASE_INDEX_PATTERN)}{' '}
          {knowledgeBaseActionButton}
        </span>
      ) : (
        <span data-test-subj="install-kb">
          {i18n.KNOWLEDGE_BASE_DESCRIPTION} {knowledgeBaseActionButton}
        </span>
      );
    }, [isKnowledgeBaseEnabled, knowledgeBaseActionButton]);

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
        <EuiText size={'s'}>{i18n.SETTINGS_DESCRIPTION}</EuiText>
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
          {isEnabledKnowledgeBaseSwitch}
        </EuiFormRow>
        <EuiSpacer size="s" />

        <EuiFlexGroup
          direction={'column'}
          gutterSize={'s'}
          css={css`
            padding-left: 5px;
          `}
        >
          <EuiFlexItem>
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
          <EuiFlexItem>
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
