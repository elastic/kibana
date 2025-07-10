/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiButtonEmpty, EuiFlexItem, EuiPopover } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { WelcomeMessageKnowledgeBaseSetupErrorPanel } from './welcome_message_knowledge_base_setup_error_panel';
import { UseKnowledgeBaseResult } from '../hooks';

export const InspectKnowledgeBasePopover = ({
  knowledgeBase,
}: {
  knowledgeBase: UseKnowledgeBaseResult;
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const handleInstall = async (inferenceId: string) => {
    setIsPopoverOpen(false);
    await knowledgeBase.install(inferenceId);
  };

  return knowledgeBase.status.value?.modelStats ? (
    <EuiFlexItem grow={false}>
      <EuiPopover
        button={
          <EuiButtonEmpty
            data-test-subj="observabilityAiAssistantWelcomeMessageInspectErrorsButton"
            iconType="inspect"
            onClick={() => setIsPopoverOpen(!isPopoverOpen)}
          >
            {i18n.translate('xpack.aiAssistant.welcomeMessage.inspectErrorsButtonEmptyLabel', {
              defaultMessage: 'Inspect',
            })}
          </EuiButtonEmpty>
        }
        isOpen={isPopoverOpen}
        panelPaddingSize="none"
        closePopover={() => setIsPopoverOpen(false)}
      >
        <WelcomeMessageKnowledgeBaseSetupErrorPanel
          knowledgeBase={knowledgeBase}
          onRetryInstall={handleInstall}
        />
      </EuiPopover>
    </EuiFlexItem>
  ) : null;
};
