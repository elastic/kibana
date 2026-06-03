/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { AiButton, type AiButtonProps } from '@kbn/shared-ux-ai-components';

export function RegenerateResponseButton(props: AiButtonProps) {
  return (
    <AiButton {...props} iconType="sparkles" size="s" variant="empty">
      {i18n.translate('xpack.observabilityAiAssistant.regenerateResponseButtonLabel', {
        defaultMessage: 'Regenerate',
      })}
    </AiButton>
  );
}
