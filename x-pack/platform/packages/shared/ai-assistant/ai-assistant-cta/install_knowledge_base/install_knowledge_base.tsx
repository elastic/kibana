/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiToolTip } from '@elastic/eui';

import { AssistantCallToAction, type AssistantCallToActionProps } from '../call_to_action';
import { translations } from './install_knowledge_base.translations';
import { CallToActionCard } from '../call_to_action_panel';

/** Data test subject for the install knowledge base button. */
export const DATA_TEST_SUBJ_INSTALL_KNOWLEDGE_BASE_BUTTON = 'aiCTAInstallKnowledgeBaseButton';

/**
 * Props for the `InstallKnowledgeBase` call to action.
 */
export interface InstallKnowledgeBaseProps
  extends Pick<AssistantCallToActionProps, 'data-test-subj' | 'centered'> {
  /** Callback to handle installing a knowledge base. */
  onInstallKnowledgeBase: () => void;
  /** True if the Knowledge Base is currently installing, false otherwise. */
  isInstalling?: boolean;
  /** True if the Knowledge Base can be installed, false otherwise. */
  isInstallAvailable?: boolean;
}

/**
 * A pure component that renders a call to action to install a knowledge base.
 */
export const InstallKnowledgeBase = ({
  onInstallKnowledgeBase,
  isInstalling = false,
  isInstallAvailable = true,
  ...props
}: InstallKnowledgeBaseProps) => (
  <AssistantCallToAction {...props}>
    <CallToActionCard
      iconType="database"
      color="subdued"
      title={translations.cardTitle}
      description={translations.cardDescription}
    >
      <EuiToolTip
        position="bottom"
        content={!isInstallAvailable ? translations.unavailableTooltip : undefined}
      >
        <EuiButton
          color="primary"
          fill
          iconType="download"
          size="s"
          onClick={onInstallKnowledgeBase}
          isDisabled={!isInstallAvailable || isInstalling}
          isLoading={isInstalling}
          data-test-subj={DATA_TEST_SUBJ_INSTALL_KNOWLEDGE_BASE_BUTTON}
        >
          {isInstalling ? translations.installingButton : translations.installButton}
        </EuiButton>
      </EuiToolTip>
    </CallToActionCard>
  </AssistantCallToAction>
);
