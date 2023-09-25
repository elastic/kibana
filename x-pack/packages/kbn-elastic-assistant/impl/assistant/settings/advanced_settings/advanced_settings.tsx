/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiFormRow,
  EuiTitle,
  EuiText,
  EuiTextColor,
  EuiHorizontalRule,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiSwitch,
  EuiToolTip,
  EuiSwitchEvent,
  EuiLink,
} from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';
import * as i18n from './translations';
import { useKnowledgeBaseStatus } from '../../../knowledge_base/use_knowledge_base_status/use_knowledge_base_status';
import { useAssistantContext } from '../../../assistant_context';
import { useSetupKnowledgeBase } from '../../../knowledge_base/use_setup_knowledge_base/use_setup_knowledge_base';
import { useDeleteKnowledgeBase } from '../../../knowledge_base/use_delete_knowledge_base/use_delete_knowledge_base';

const ESQL_RESOURCE = 'esql';
interface Props {
  onAdvancedSettingsChange?: () => void;
}

/**
 * Advanced Settings -- enable and disable LangChain integration, Knowledge Base, and ESQL KB Documents
 */
export const AdvancedSettings: React.FC<Props> = React.memo(({ onAdvancedSettingsChange }) => {
  const { http, assistantLangChain } = useAssistantContext();
  const {
    data: kbStatus,
    isLoading,
    isFetching,
  } = useKnowledgeBaseStatus({ http, resource: ESQL_RESOURCE });
  const { mutate: setupKB, isLoading: isSettingUpKB } = useSetupKnowledgeBase({ http });
  const { mutate: deleteKB, isLoading: isDeletingUpKB } = useDeleteKnowledgeBase({ http });

  const [isLangChainEnabled, setIsLangChainEnabled] = useState(assistantLangChain);
  const isKnowledgeBaseEnabled =
    (kbStatus?.index_exists && kbStatus?.pipeline_exists && kbStatus?.elser_exists) ?? false;
  const isESQLEnabled = kbStatus?.esql_exists ?? false;

  const isLoadingKb = isLoading || isFetching || isSettingUpKB || isDeletingUpKB;
  const isKnowledgeBaseAvailable = isLangChainEnabled && kbStatus?.elser_exists;
  const isESQLAvailable = isLangChainEnabled && isKnowledgeBaseAvailable && isKnowledgeBaseEnabled;

  const onEnableKnowledgeBaseChange = useCallback(
    (event: EuiSwitchEvent) => {
      if (event.target.checked) {
        setupKB();
      } else {
        deleteKB();
      }
    },
    [deleteKB, setupKB]
  );

  const onEnableESQLChange = useCallback(
    (event: EuiSwitchEvent) => {
      if (event.target.checked) {
        setupKB(ESQL_RESOURCE);
      } else {
        deleteKB(ESQL_RESOURCE);
      }
    },
    [deleteKB, setupKB]
  );

  const langchainSwitch = useMemo(() => {
    return (
      <EuiSwitch
        checked={isLangChainEnabled}
        compressed
        disabled={true} // Advanced settings only shown if assistantLangChain=true, remove when storing to localstorage as ui feature toggle
        label={i18n.LANNGCHAIN_LABEL}
        onChange={() => setIsLangChainEnabled(!isLangChainEnabled)}
        showLabel={false}
      />
    );
  }, [isLangChainEnabled]);

  const knowledgeBaseSwitch = useMemo(() => {
    return isLoadingKb ? (
      <EuiLoadingSpinner size="s" />
    ) : (
      <EuiToolTip
        position={'right'}
        content={!isKnowledgeBaseAvailable ? i18n.KNOWLEDGE_BASE_LABEL_TOOLTIP : undefined}
      >
        <EuiSwitch
          showLabel={false}
          label={i18n.KNOWLEDGE_BASE_LABEL}
          checked={isKnowledgeBaseEnabled}
          disabled={!isKnowledgeBaseAvailable}
          onChange={onEnableKnowledgeBaseChange}
          compressed
        />
      </EuiToolTip>
    );
  }, [isLoadingKb, isKnowledgeBaseAvailable, isKnowledgeBaseEnabled, onEnableKnowledgeBaseChange]);

  const esqlSwitch = useMemo(() => {
    return isLoadingKb ? (
      <EuiLoadingSpinner size="s" />
    ) : (
      <EuiToolTip
        position={'right'}
        content={!isESQLAvailable ? i18n.ESQL_LABEL_TOOLTIP : undefined}
      >
        <EuiSwitch
          showLabel={false}
          label={i18n.ESQL_LABEL}
          checked={isESQLEnabled}
          disabled={!isESQLAvailable}
          onChange={onEnableESQLChange}
          compressed
        />
      </EuiToolTip>
    );
  }, [isLoadingKb, isESQLAvailable, isESQLEnabled, onEnableESQLChange]);

  return (
    <>
      <EuiTitle size={'s'}>
        <h2>{i18n.SETTINGS_TITLE}</h2>
      </EuiTitle>
      <EuiSpacer size="xs" />

      <EuiText size={'s'}>{i18n.SETTINGS_DESCRIPTION}</EuiText>

      <EuiHorizontalRule margin={'s'} />

      <EuiFormRow display="columnCompressedSwitch" label={i18n.LANNGCHAIN_LABEL}>
        {langchainSwitch}
      </EuiFormRow>
      <EuiSpacer size="xs" />
      <EuiTextColor color={'subdued'}>{i18n.LANNGCHAIN_DESCRIPTION}</EuiTextColor>
      <EuiSpacer size="m" />

      <EuiFormRow
        display="columnCompressedSwitch"
        label={i18n.KNOWLEDGE_BASE_LABEL}
        isDisabled={!isKnowledgeBaseAvailable}
      >
        {knowledgeBaseSwitch}
      </EuiFormRow>
      <EuiSpacer size="xs" />
      <EuiTextColor color={'subdued'}>
        <FormattedMessage
          defaultMessage="Initializes a local knowledge base for saving and retrieving relevant context for your conversations. Note: ELSER must be configured and started. {seeDocs}"
          id="xpack.elasticAssistant.assistant.settings.advancedSettings.knowledgeBaseDescription"
          values={{
            seeDocs: (
              <EuiLink
                external
                href={
                  'https://www.elastic.co/guide/en/machine-learning/current/ml-nlp-elser.html#download-deploy-elser'
                }
                target="_blank"
              >
                {i18n.KNOWLEDGE_BASE_DESCRIPTION_ELSER_LEARN_MORE}
              </EuiLink>
            ),
          }}
        />
      </EuiTextColor>
      <EuiSpacer size="m" />

      <EuiFormRow
        isDisabled={!isESQLAvailable}
        display="columnCompressedSwitch"
        label={i18n.ESQL_LABEL}
      >
        {esqlSwitch}
      </EuiFormRow>
      <EuiSpacer size="xs" />
      <EuiTextColor color={'subdued'}>{i18n.ESQL_DESCRIPTION}</EuiTextColor>
      <EuiSpacer size="m" />
    </>
  );
});

AdvancedSettings.displayName = 'AdvancedSettings';
