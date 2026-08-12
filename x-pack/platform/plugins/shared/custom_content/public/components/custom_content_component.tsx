/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProgress, useEuiTheme } from '@elastic/eui';
import { KbnDangerCallout, KbnWarningCallout } from '@kbn/ui-callout';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { TimeRange } from '@kbn/es-query';
import React, { useEffect, useMemo } from 'react';
import { useCustomContentHtml } from '../hooks/use_custom_content_html';

interface CustomContentComponentProps {
  embeddableId: string;
  prompt: string | undefined;
  esqlQuery: string | undefined;
  timeRange: TimeRange | undefined;
  generationVersion: number;
  savedTemplate: string | undefined;
  onErrorChange?: (error: string | undefined) => void;
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

export const CustomContentComponent = ({
  embeddableId,
  prompt,
  esqlQuery,
  timeRange,
  generationVersion,
  savedTemplate,
  onErrorChange,
}: CustomContentComponentProps) => {
  const { euiTheme, colorMode } = useEuiTheme();
  const { html, isLoading, error, noContent } = useCustomContentHtml({
    embeddableId,
    esqlQuery,
    timeRange,
    generationVersion,
    savedTemplate,
    colorMode,
    euiTheme,
  });

  useEffect(() => {
    onErrorChange?.(error);
  }, [error, onErrorChange]);

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
      {error && (
        <KbnDangerCallout
          title={i18n.translate('xpack.customContent.error.title', {
            defaultMessage: 'Failed to render panel',
          })}
          style={{ margin: euiTheme.size.base }}
          announceOnMount
        >
          {error}
        </KbnDangerCallout>
      )}
      {!error && noContent && !isLoading && (
        <KbnWarningCallout
          announceOnMount
          title={i18n.translate('xpack.customContent.noContent.title', {
            defaultMessage: 'Content not yet generated',
          })}
          style={{ margin: euiTheme.size.base }}
        >
          {i18n.translate('xpack.customContent.noContent.body', {
            defaultMessage:
              'This panel has no content. Use the AI chat to refine it, or edit the panel to generate content.',
          })}
        </KbnWarningCallout>
      )}
      {!error && !noContent && html && (
        <div css={iframeContainerCss}>
          <iframe css={iframeCss} srcDoc={html} sandbox="" title="Custom content panel" />
        </div>
      )}
      {isLoading && <EuiProgress size="xs" color="accent" position="absolute" />}
    </div>
  );
};
