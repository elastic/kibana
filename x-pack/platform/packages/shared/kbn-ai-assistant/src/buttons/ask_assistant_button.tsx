/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiToolTip } from '@elastic/eui';
import { AiButton, type AiButtonProps } from '@kbn/shared-ux-ai-components';

export function AskAssistantButton({ size, variant, onClick, ...props }: AiButtonProps) {
  const buttonLabel = i18n.translate('xpack.aiAssistant.askAssistantButton.buttonLabel', {
    defaultMessage: 'Ask Assistant',
  });

  const aiAssistantLabel = i18n.translate('xpack.aiAssistant.aiAssistantLabel', {
    defaultMessage: 'AI Assistant',
  });

  if (variant === 'base' || variant === 'accent') {
    return (
      <AiButton iconType="sparkles" size={size} variant={variant} onClick={onClick} {...props}>
        {buttonLabel}
      </AiButton>
    );
  }

  if (variant === 'empty') {
    return (
      <AiButton iconType="sparkles" size={size} variant="empty" onClick={onClick} {...props}>
        {buttonLabel}
      </AiButton>
    );
  }

  if (props.iconOnly) {
    return (
      <EuiToolTip
        position="top"
        title={aiAssistantLabel}
        content={i18n.translate('xpack.aiAssistant.askAssistantButton.popoverContent', {
          defaultMessage: 'Get insights into your data with the Elastic Assistant',
        })}
      >
        <AiButton
          {...props}
          onClick={onClick}
          iconOnly
          iconType="sparkles"
          aria-label={aiAssistantLabel}
        />
      </EuiToolTip>
    );
  }
}
