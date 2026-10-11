/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiEmptyPrompt, EuiSpacer, EuiTitle, EuiText } from '@elastic/eui';
import { AiButton } from '@kbn/shared-ux-ai-components';
import { i18n } from '@kbn/i18n';
import { CustomContentIllustration } from './custom_content_illustration';

interface CustomContentEmptyPromptProps {
  isAiAvailable: boolean;
  onGenerateWithChat?: () => void;
}

export const CustomContentEmptyPrompt = ({
  isAiAvailable,
  onGenerateWithChat,
}: CustomContentEmptyPromptProps) => (
  <EuiEmptyPrompt
    icon={<CustomContentIllustration />}
    title={
      <EuiTitle size="s">
        <h3>
          {i18n.translate('xpack.customContent.noContent.title', {
            defaultMessage: 'Create your custom panel',
          })}
        </h3>
      </EuiTitle>
    }
    body={
      <>
        <EuiSpacer size="s" />
        <EuiText size="s">
          <p>
            {isAiAvailable
              ? i18n.translate('xpack.customContent.noContent.bodyAi', {
                  defaultMessage:
                    'Examples: "Create a health status card for each of my hosts", "Create a banner with an animated image", "Show how data flows across my services".',
                })
              : i18n.translate('xpack.customContent.noContent.bodyNoAi', {
                  defaultMessage: 'Use HTML, CSS, Liquid, and ES|QL to create your custom panel',
                })}
          </p>
        </EuiText>
      </>
    }
    actions={
      isAiAvailable &&
      onGenerateWithChat && (
        <>
          <EuiSpacer size="s" />
          <AiButton iconType="sparkles" onClick={onGenerateWithChat}>
            {i18n.translate('xpack.customContent.noContent.generateWithChat', {
              defaultMessage: 'Generate with chat',
            })}
          </AiButton>
        </>
      )
    }
  />
);
