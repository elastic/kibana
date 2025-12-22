/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiIcon,
  EuiAccordion,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiSkeletonText,
  EuiMarkdownFormat,
  useEuiTheme,
} from '@elastic/eui';
import type { ILicense } from '@kbn/licensing-types';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { StartConversationButton } from './start_conversation_button';
import { AiInsightErrorBanner } from './ai_insight_error_banner';

export interface AiInsightProps {
  title: string;
  description: string;
  license: ILicense | undefined | null;
  content?: string;
  onStartConversation?: () => void;
  onOpen: () => void;
  isLoading?: boolean;
  error?: string;
}

export function AiInsight({
  title,
  description,
  content,
  license,
  onStartConversation,
  onOpen,
  isLoading,
  error,
}: AiInsightProps) {
  const { euiTheme } = useEuiTheme();
  const [isOpen, setIsOpen] = useState(false);
  const { services } = useKibana();

  const hasEnterpriseLicense = license?.hasAtLeast('enterprise');
  const hasAgentBuilderAccess = services.application?.capabilities?.agentBuilder?.show === true;

  if (!hasAgentBuilderAccess || !hasEnterpriseLicense) {
    return null;
  }

  return (
    <EuiPanel hasBorder={true} hasShadow={false} paddingSize="m">
      <EuiAccordion
        id="agentBuilderAiInsight"
        arrowProps={{ css: { alignSelf: 'flex-start' } }}
        buttonContent={
          <EuiFlexGroup
            wrap
            responsive={false}
            gutterSize="m"
            alignItems="flexStart"
            data-test-subj="agentBuilderAiInsight"
          >
            <EuiFlexItem grow={false}>
              <EuiIcon
                type="sparkles"
                color={euiTheme.colors.primary}
                style={{ marginTop: 6 }}
                size="l"
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText css={{ marginTop: 2, marginBottom: 1 }}>
                <h5>{title}</h5>
              </EuiText>
              <EuiText size="s" css={{ color: euiTheme.colors.textSubdued }}>
                <span>{description}</span>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        }
        isLoading={false}
        isDisabled={false}
        forceState={isOpen ? 'open' : 'closed'}
        onToggle={(open) => {
          setIsOpen(open);
          if (open && !error && !content && !isLoading) {
            onOpen();
          }
        }}
      >
        <EuiSpacer size="m" />
        <EuiPanel color="subdued">
          {isLoading ? (
            <EuiSkeletonText lines={3} />
          ) : error ? (
            <AiInsightErrorBanner error={error} onRetry={onOpen} />
          ) : (
            <EuiMarkdownFormat textSize="s">{content ?? ''}</EuiMarkdownFormat>
          )}
        </EuiPanel>

        {!isLoading && onStartConversation && Boolean(content && content.trim()) ? (
          <>
            <EuiSpacer size="m" />
            <EuiFlexGroup justifyContent="flexEnd" gutterSize="s" responsive={false}>
              <EuiFlexItem grow={false}>
                <StartConversationButton onClick={onStartConversation} />
              </EuiFlexItem>
            </EuiFlexGroup>
          </>
        ) : null}
      </EuiAccordion>
    </EuiPanel>
  );
}
