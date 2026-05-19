/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { apm } from '@elastic/apm-rum';
import { EuiButtonEmpty, EuiCallOut, EuiCodeBlock, EuiSpacer, EuiText } from '@elastic/eui';

import * as i18n from './translations';

interface Props {
  children: React.ReactNode;
  /**
   * Original markdown source. Shown to the user when the renderer throws so
   * the underlying content remains visible (and copy-pastable).
   */
  source?: string;
  'data-test-subj'?: string;
}

interface State {
  hasError: boolean;
  showSource: boolean;
}

export class MarkdownErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, showSource: false };

  static getDerivedStateFromError(): State {
    return { hasError: true, showSource: false };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    apm.captureError(error, {
      labels: { component: 'CasesMarkdownRenderer' },
      custom: { componentStack: info.componentStack ?? '' },
    });
  }

  private readonly toggleSource = () => this.setState((prev) => ({ showSource: !prev.showSource }));

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const { source } = this.props;
    const { showSource } = this.state;

    return (
      <EuiCallOut
        data-test-subj={this.props['data-test-subj'] ?? 'markdown-error-boundary'}
        size="s"
        color="warning"
        iconType="warning"
        title={i18n.RENDER_ERROR_TITLE}
      >
        <EuiText size="s">
          <p>{i18n.RENDER_ERROR_DESCRIPTION}</p>
        </EuiText>
        {source != null && source.length > 0 ? (
          <>
            <EuiSpacer size="xs" />
            <EuiButtonEmpty
              size="xs"
              flush="left"
              onClick={this.toggleSource}
              iconType={showSource ? 'eyeClosed' : 'eye'}
              data-test-subj="markdown-error-boundary-toggle-source"
            >
              {showSource ? i18n.HIDE_RAW_CONTENT : i18n.SHOW_RAW_CONTENT}
            </EuiButtonEmpty>
            {showSource ? (
              <>
                <EuiSpacer size="xs" />
                <EuiCodeBlock
                  language="markdown"
                  fontSize="s"
                  paddingSize="s"
                  isCopyable
                  data-test-subj="markdown-error-boundary-source"
                >
                  {source}
                </EuiCodeBlock>
              </>
            ) : null}
          </>
        ) : null}
      </EuiCallOut>
    );
  }
}
