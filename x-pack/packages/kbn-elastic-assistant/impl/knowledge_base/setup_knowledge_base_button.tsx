/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiButton, EuiButtonEmpty, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { useAssistantContext } from '../..';
import { useSetupKnowledgeBase } from '../assistant/api/knowledge_base/use_setup_knowledge_base';
import { useKnowledgeBaseStatus } from '../assistant/api/knowledge_base/use_knowledge_base_status';

const ESQL_RESOURCE = 'esql';

interface Props {
  display?: 'mini';
}

/**
 * Self-contained component that renders a button to set up the knowledge base.
 *
 */
export const SetupKnowledgeBaseButton: React.FC<Props> = React.memo(({ display }: Props) => {
  const { http, toasts } = useAssistantContext();

  const { data: kbStatus } = useKnowledgeBaseStatus({ http, resource: ESQL_RESOURCE });
  const { mutate: setupKB, isLoading: isSettingUpKB } = useSetupKnowledgeBase({ http, toasts });

  const isSetupInProgress = kbStatus?.is_setup_in_progress || isSettingUpKB;
  const isSetupComplete =
    kbStatus?.elser_exists &&
    kbStatus?.index_exists &&
    kbStatus?.pipeline_exists &&
    kbStatus?.esql_exists;

  const onInstallKnowledgeBase = useCallback(() => {
    setupKB(ESQL_RESOURCE);
  }, [setupKB]);

  if (isSetupComplete) {
    return null;
  }

  const toolTipContent = !kbStatus?.is_setup_available
    ? i18n.translate('xpack.elasticAssistant.knowledgeBase.installKnowledgeBaseButtonToolTip', {
        defaultMessage: 'Knowledge Base unavailable, please see documentation for more details.',
      })
    : undefined;

  return (
    <EuiToolTip position={'bottom'} content={toolTipContent}>
      {display === 'mini' ? (
        <EuiButtonEmpty
          color="primary"
          data-test-subj="setup-knowledge-base-button"
          disabled={!kbStatus?.is_setup_available}
          isLoading={isSetupInProgress}
          iconType="importAction"
          onClick={onInstallKnowledgeBase}
          size={'xs'}
        >
          {i18n.translate('xpack.elasticAssistant.knowledgeBase.installKnowledgeBaseButton', {
            defaultMessage: 'Setup Knowledge Base',
          })}
        </EuiButtonEmpty>
      ) : (
        <EuiButton
          color="primary"
          data-test-subj="setup-knowledge-base-button"
          fill
          disabled={!kbStatus?.is_setup_available}
          isLoading={isSetupInProgress}
          iconType="importAction"
          onClick={onInstallKnowledgeBase}
        >
          {i18n.translate('xpack.elasticAssistant.knowledgeBase.installKnowledgeBaseButton', {
            defaultMessage: 'Setup Knowledge Base',
          })}
        </EuiButton>
      )}
    </EuiToolTip>
  );
});

SetupKnowledgeBaseButton.displayName = 'SetupKnowledgeBaseButton';
