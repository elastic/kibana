/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export function Disclaimer() {
  return (
    <EuiText
      color="subdued"
      size="xs"
      textAlign="center"
      data-test-subj="observabilityAiAssistantDisclaimer"
    >
      {i18n.translate('xpack.aiAssistant.disclaimer.disclaimerLabel', {
        defaultMessage:
          "This conversation is powered by an integration with your LLM provider. LLMs are known to sometimes present incorrect information as if it's correct. Elastic supports configuration and connection to the LLM provider and your knowledge base, but is not responsible for the LLM's responses.",
      })}
    </EuiText>
  );
}
