/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiEmptyPrompt, EuiProgress, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React, { useEffect, useMemo } from 'react';
import { useCustomContentHtml } from '../hooks/use_custom_content_html';

interface CustomContentComponentProps {
  embeddableId: string;
  prompt: string | undefined;
  generationVersion: number;
  savedTemplate: string | undefined;
  onTemplateChange: (template: string) => void;
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
  generationVersion,
  savedTemplate,
  onTemplateChange,
  onErrorChange,
}: CustomContentComponentProps) => {
  const { euiTheme, colorMode } = useEuiTheme();
  const { html, isLoading, error, isAiUnavailable } = useCustomContentHtml({
    embeddableId,
    prompt,
    generationVersion,
    savedTemplate,
    colorMode,
    onTemplateChange,
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
      {isAiUnavailable && (
        <EuiEmptyPrompt
          iconType="sparkles"
          iconColor="subdued"
          title={
            <h3>
              {i18n.translate('xpack.customContent.aiUnavailable.title', {
                defaultMessage: 'Set up an AI connector to use this panel',
              })}
            </h3>
          }
          body={
            <p>
              {i18n.translate('xpack.customContent.aiUnavailable.body', {
                defaultMessage:
                  'This panel generates content using AI. Ask your administrator to configure an AI connector in Stack Management.',
              })}
            </p>
          }
          color="subdued"
        />
      )}
      {!isAiUnavailable && error && (
        <EuiCallOut
          color="danger"
          title={i18n.translate('xpack.customContent.error.title', {
            defaultMessage: 'Failed to generate panel',
          })}
          style={{ margin: euiTheme.size.base }}
          announceOnMount
        >
          {error}
        </EuiCallOut>
      )}
      {!isAiUnavailable && !error && html && (
        <div css={iframeContainerCss}>
          <iframe css={iframeCss} srcDoc={html} sandbox="" title="Custom content panel" />
        </div>
      )}
      {isLoading && <EuiProgress size="xs" color="accent" position="absolute" />}
    </div>
  );
};
