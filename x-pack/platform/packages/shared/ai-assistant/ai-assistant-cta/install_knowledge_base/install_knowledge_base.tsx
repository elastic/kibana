/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiCallOut, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';

import { AssistantCallToAction } from '../call_to_action';
import { translations } from './install_knowledge_base.translations';

const InstallKnowledgeBasePanel = ({ onInstallKnowledgeBase }: InstallKnowledgeBaseProps) => (
  <EuiCallOut iconType="database" title={translations.panelTitle}>
    <EuiFlexGroup direction="column" gutterSize="m">
      <EuiFlexItem>
        <EuiText size="s">{translations.panelDescription}</EuiText>
      </EuiFlexItem>
      <EuiFlexItem>
        <span>
          <EuiButton
            color="primary"
            fill
            iconType="download"
            size="s"
            onClick={onInstallKnowledgeBase}
          >
            {translations.installButton}
          </EuiButton>
        </span>
      </EuiFlexItem>
    </EuiFlexGroup>
  </EuiCallOut>
);

/**
 * Props for the `InstallKnowledgeBase`.
 */
export interface InstallKnowledgeBaseProps {
  onInstallKnowledgeBase: () => void;
}

/**
 * A pure component that renders a call to action to install a knowledge base.
 */
export const InstallKnowledgeBase = (props: InstallKnowledgeBaseProps) => (
  <AssistantCallToAction>
    <InstallKnowledgeBasePanel {...props} />
  </AssistantCallToAction>
);
