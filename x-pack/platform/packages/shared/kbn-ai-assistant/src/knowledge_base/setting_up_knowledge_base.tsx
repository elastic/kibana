/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonEmpty, EuiSpacer, EuiText } from '@elastic/eui';

export const SettingUpKnowledgeBase = () => (
  <>
    <EuiText color="subdued" size="s">
      {i18n.translate('xpack.aiAssistant.welcomeMessage.weAreSettingUpTextLabel', {
        defaultMessage:
          'We are setting up your knowledge base. This may take a few minutes. You can continue to use the Assistant while this process is underway.',
      })}
    </EuiText>

    <EuiSpacer size="m" />

    <EuiButtonEmpty
      data-test-subj="observabilityAiAssistantWelcomeMessageSettingUpKnowledgeBaseText"
      isLoading
    >
      {i18n.translate('xpack.aiAssistant.welcomeMessage.div.settingUpKnowledgeBaseLabel', {
        defaultMessage: 'Setting up Knowledge Base',
      })}
    </EuiButtonEmpty>
  </>
);
