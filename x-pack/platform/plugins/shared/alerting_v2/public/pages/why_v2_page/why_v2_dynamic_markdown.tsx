/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiHorizontalRule,
  EuiLoadingSpinner,
  EuiMarkdownFormat,
  EuiSpacer,
  useEuiTheme,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useWhyV2Markdown } from '../../hooks/use_why_v2_markdown';
import { whyV2PageStyles } from './why_v2_page.styles';

const TERMINAL_FILENAME = 'preview-guide.md';

export const WhyV2DynamicMarkdown = () => {
  const theme = useEuiTheme();
  const { markdown, source, isLoading } = useWhyV2Markdown();

  return (
    <section data-test-subj="whyV2DynamicMarkdown">
      <EuiSpacer size="xxl" />
      <div css={whyV2PageStyles.terminalWindow(theme)} data-test-subj="whyV2TerminalWindow">
        <div css={whyV2PageStyles.terminalChrome(theme)}>
          <div css={whyV2PageStyles.terminalTrafficLights(theme)}>
            <span css={whyV2PageStyles.terminalDot('#FF5F57')()} aria-hidden />
            <span css={whyV2PageStyles.terminalDot('#FEBC2E')()} aria-hidden />
            <span css={whyV2PageStyles.terminalDot('#28C840')()} aria-hidden />
          </div>
          <span css={whyV2PageStyles.terminalTitle(theme)}>{TERMINAL_FILENAME}</span>
          <span css={whyV2PageStyles.terminalSourceBadge(theme)} data-test-subj="whyV2MarkdownSource">
            {source === 'bundled' ? (
              <FormattedMessage
                id="xpack.alertingV2.whyV2.markdown.bundledSource"
                defaultMessage="bundled · placeholder"
              />
            ) : (
              <FormattedMessage
                id="xpack.alertingV2.whyV2.markdown.dynamicSource"
                defaultMessage="live"
              />
            )}
          </span>
        </div>
        <div css={whyV2PageStyles.terminalBody(theme)}>
          <div css={whyV2PageStyles.terminalPrompt(theme)} aria-hidden>
            <span css={whyV2PageStyles.terminalPromptSymbol(theme)}>$</span>
            <span css={whyV2PageStyles.terminalPromptCommand(theme)}>
              cat {TERMINAL_FILENAME}
            </span>
            <span css={whyV2PageStyles.terminalCursor(theme)} />
          </div>
          {isLoading ? (
            <EuiLoadingSpinner size="l" />
          ) : (
            <div css={whyV2PageStyles.terminalMarkdown(theme)}>
              <EuiMarkdownFormat color="ghost" textSize="xs" data-test-subj="whyV2MarkdownContent">
                {markdown}
              </EuiMarkdownFormat>
            </div>
          )}
        </div>
      </div>
      <EuiHorizontalRule margin="xl" />
    </section>
  );
};
