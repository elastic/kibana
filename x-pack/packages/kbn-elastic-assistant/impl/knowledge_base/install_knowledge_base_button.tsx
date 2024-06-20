/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { useAssistantContext } from '../..';
import { useSetupKnowledgeBase } from '../assistant/api/knowledge_base/use_setup_knowledge_base';
import { useKnowledgeBaseStatus } from '../assistant/api/knowledge_base/use_knowledge_base_status';

const ESQL_RESOURCE = 'esql';

/**
 * Self-contained component that renders a button to install the knowledge base.
 *
 * Only renders if `assistantKnowledgeBaseByDefault` feature flag is enabled.
 */
export const InstallKnowledgeBaseButton: React.FC = React.memo(() => {
  const {
    assistantFeatures: { assistantKnowledgeBaseByDefault: enableKnowledgeBaseByDefault },
    http,
    toasts,
  } = useAssistantContext();

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

  if (!enableKnowledgeBaseByDefault || isSetupComplete) {
    return null;
  }

  return (
    <EuiButton
      color="primary"
      data-test-subj="install-knowledge-base-button"
      fill
      isLoading={isSetupInProgress}
      iconType="importAction"
      onClick={onInstallKnowledgeBase}
    >
      {i18n.translate('xpack.elasticAssistant.knowledgeBase.installKnowledgeBaseButton', {
        defaultMessage: 'Install Knowledge Base',
      })}
    </EuiButton>
  );
});

InstallKnowledgeBaseButton.displayName = 'InstallKnowledgeBaseButton';
