/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiButtonIcon, EuiButtonEmpty, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { css } from '@emotion/react';
import { useKnowledgeBaseInstall } from './use_knowledge_base_install';

interface Props {
  display?: 'mini' | 'refresh';
}

/**
 * Self-contained component that renders a button to set up the knowledge base.
 */
export const SetupKnowledgeBaseButton: React.FC<Props> = React.memo(({ display }: Props) => {
  const { isSetupAvailable, isSetupInProgress, onInstallKnowledgeBase } = useKnowledgeBaseInstall();

  const toolTipContent = !isSetupAvailable
    ? i18n.translate('xpack.elasticAssistant.knowledgeBase.installKnowledgeBaseButtonToolTip', {
        defaultMessage: 'Knowledge Base unavailable, please see documentation for more details.',
      })
    : undefined;

  if (display === 'refresh') {
    return (
      <EuiButtonIcon
        color="primary"
        data-test-subj="setup-knowledge-base-button"
        disabled={!isSetupAvailable}
        isLoading={isSetupInProgress}
        iconType="refresh"
        onClick={onInstallKnowledgeBase}
        size="xs"
        css={css`
          margin-left: 8px;
        `}
      />
    );
  }

  return (
    <EuiToolTip position={'bottom'} content={toolTipContent}>
      {display === 'mini' ? (
        <EuiButtonEmpty
          color="primary"
          data-test-subj="setup-knowledge-base-button"
          disabled={!isSetupAvailable}
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
          disabled={!isSetupAvailable}
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
