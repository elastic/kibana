/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiText, EuiLink } from '@elastic/eui';
import React from 'react';
import { MarkedString } from 'vscode-languageserver-types';
import ReactMarkdown from 'react-markdown';
// @ts-ignore
import { tokenizeToString } from 'monaco-editor/esm/vs/editor/common/modes/textToHtmlTokenizer';
// @ts-ignore
import { TokenizationRegistry } from 'monaco-editor/esm/vs/editor/common/modes';

export interface HoverWidgetProps {
  state: HoverState;
  contents?: MarkedString[];
  gotoDefinition: () => void;
  findReferences: () => void;
}

export enum HoverState {
  LOADING,
  INITIALIZING,
  READY,
}

export class HoverWidget extends React.PureComponent<HoverWidgetProps> {
  public render() {
    let contents;

    switch (this.props.state) {
      case HoverState.READY:
        contents = this.renderContents();
        break;
      case HoverState.INITIALIZING:
        contents = this.renderInitialting();
        break;
      case HoverState.LOADING:
      default:
        contents = this.renderLoading();
    }
    return <React.Fragment>{contents}</React.Fragment>;
  }

  private renderLoading() {
    return (
      <div className="hover-row">
        <div className="text-placeholder gradient" />
        <div className="text-placeholder gradient" style={{ width: '90%' }} />
        <div className="text-placeholder gradient" style={{ width: '75%' }} />
      </div>
    );
  }

  private renderContents() {
    const markdownRenderers = {
      link: ({ children, href }: { children: React.ReactNode[]; href?: string }) => (
        <EuiLink href={href} target="_blank">
          {children}
        </EuiLink>
      ),
      code: ({ value, language }: { value: string; language: string }) => {
        const support = TokenizationRegistry.get(language);
        const code = tokenizeToString(value, support);
        return <div className="code" dangerouslySetInnerHTML={{ __html: code }} />;
      },
    };
    return this.props
      .contents!.filter(content => !!content)
      .map((markedString, idx) => {
        let markdown: string;
        if (typeof markedString === 'string') {
          markdown = markedString;
        } else if (markedString.language) {
          markdown = '```' + markedString.language + '\n' + markedString.value + '\n```';
        } else {
          markdown = markedString.value;
        }

        return (
          <div className="hover-row" key={`hover_${idx}`}>
            <ReactMarkdown
              source={markdown}
              escapeHtml={true}
              skipHtml={true}
              renderers={markdownRenderers}
            />
          </div>
        );
      });
  }

  private renderInitialting() {
    return (
      <div className="hover-row">
        {/*
              // @ts-ignore */}
        <EuiText textAlign="center">
          <h4>Language Server is initializing…</h4>
          <EuiText size="xs" color="subdued">
            <p>Depending on the size of your repo, this could take a few minutes.</p>
          </EuiText>
        </EuiText>
      </div>
    );
  }
}
