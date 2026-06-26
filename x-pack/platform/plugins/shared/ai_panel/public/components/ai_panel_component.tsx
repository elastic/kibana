/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiProgress,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';
import { useAiPanelHtml } from '../hooks/use_ai_panel_html';

interface AiPanelComponentProps {
  embeddableId: string;
  title: string | undefined;
  hideTitle: boolean | undefined;
  prompt: string;
  esqlQuery: string | undefined;
  timeRange: { from: string; to: string } | undefined;
  generationVersion: number;
  savedTemplate: string | undefined;
  onTemplateChange: (template: string) => void;
}

const iframeContainerCss = css({
  position: 'relative',
  flex: '1 1 0%',
  minHeight: 200,
});

const iframeCss = css({
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  border: 'none',
  background: 'transparent',
});

export const AiPanelComponent = ({
  embeddableId,
  title,
  hideTitle,
  prompt,
  esqlQuery,
  timeRange,
  generationVersion,
  savedTemplate,
  onTemplateChange,
}: AiPanelComponentProps) => {
  const { euiTheme } = useEuiTheme();
  const { html, isLoading, error } = useAiPanelHtml({
    embeddableId,
    prompt,
    esqlQuery,
    timeRange,
    generationVersion,
    savedTemplate,
    onTemplateChange,
  });

  const wrapperCss = useMemo(
    () =>
      css({
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        flex: '1 1 100%',
        minHeight: 200,
        background: euiTheme.colors.emptyShade,
      }),
    [euiTheme.colors.emptyShade]
  );

  return (
    <div css={wrapperCss}>
      {isLoading && <EuiProgress size="xs" color="accent" position="absolute" />}
      {!hideTitle && title && (
        <EuiFlexGroup
          alignItems="center"
          gutterSize="s"
          responsive={false}
          style={{ padding: '8px 16px 0', flexShrink: 0 }}
        >
          <EuiFlexItem grow={false}>
            <EuiTitle size="xs">
              <h3>{title}</h3>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow">
              {i18n.translate('aiPanel.badge.aiGenerated', {
                defaultMessage: 'AI generated',
              })}
            </EuiBadge>
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
      {error && (
        <EuiCallOut
          color="danger"
          title={i18n.translate('aiPanel.error.title', {
            defaultMessage: 'Failed to generate panel',
          })}
          style={{ margin: 16 }}
          announceOnMount
        >
          {error}
        </EuiCallOut>
      )}
      {!error && html && (
        <div css={iframeContainerCss}>
          <iframe css={iframeCss} srcDoc={html} sandbox="" title={title ?? 'AI panel'} />
        </div>
      )}
    </div>
  );
};
