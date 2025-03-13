/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton } from '@elastic/eui';

import { AssistantCallToAction } from '../call_to_action';
import { translations } from './install_knowledge_base.translations';
import { CallToActionCard } from '../call_to_action_panel';

/**
 * Props for the `InstallKnowledgeBase`.
 */
export interface InstallKnowledgeBaseProps {
  /** Callback to handle installing a knowledge base. */
  onInstallKnowledgeBase: () => void;
}

/**
 * A pure component that renders a call to action to install a knowledge base.
 */
export const InstallKnowledgeBase = ({ onInstallKnowledgeBase }: InstallKnowledgeBaseProps) => (
  <AssistantCallToAction>
    <CallToActionCard
      iconType="database"
      color="subdued"
      title={translations.cardTitle}
      description={translations.cardDescription}
    >
      <EuiButton color="primary" fill iconType="download" size="s" onClick={onInstallKnowledgeBase}>
        {translations.installButton}
      </EuiButton>
    </CallToActionCard>
  </AssistantCallToAction>
);
