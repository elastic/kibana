/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import { editor } from 'monaco-editor';
import { ResizeChecker } from 'ui/resize_checker';
import {
  EuiFlexGroup,
  EuiProgress,
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentHeader,
  EuiPageContentHeaderSection,
  EuiPageContentBody,
} from '@elastic/eui';
import { monaco } from '../../monaco/monaco';
import { requestFile } from '../../sagas/file';
import { GitBlame } from '../../../common/git_blame';
import { BlameWidget } from '../../monaco/blame/blame_widget';
import { requestBlame } from '../../sagas/blame';

export interface Props {
  repo: string;
  file: string;
  revision: string;
  showBlame?: boolean;
}

interface State {
  loading: boolean;
}

export class CodeViewer extends Component<Props, State> {
  private ed?: editor.IStandaloneCodeEditor;
  public blameWidgets: any;
  private lineDecorations: string[] | null = null;
  private resizeChecker?: ResizeChecker;

  constructor(props: Props, context: any) {
    super(props, context);
    this.state = {
      loading: true,
    };
  }

  public componentDidMount(): void {
    this.tryLoadFile(this.props);
  }

  public componentWillUnmount(): void {
    if (this.ed) {
      this.ed.dispose();
      this.destroyBlameWidgets();
    }
  }

  private async tryLoadFile({ file, revision, repo, showBlame }: Props) {
    this.setState({ loading: true });
    const { content, lang } = await requestFile({
      path: file,
      revision,
      uri: repo,
    });
    try {
      await monaco.editor.colorize(content!, lang!, {});
      this.loadFile(content!, lang);
    } catch (e) {
      this.loadFile(content!);
    }
    if (showBlame) {
      const blames: GitBlame[] = await requestBlame(repo, revision, file);
      this.loadBlame(blames);
    }
    this.setState({ loading: false });
  }

  public loadBlame(blames: GitBlame[]) {
    if (this.blameWidgets) {
      this.destroyBlameWidgets();
    }
    if (!this.lineDecorations) {
      this.lineDecorations = this.ed!.deltaDecorations(
        [],
        [
          {
            range: new monaco.Range(1, 1, Infinity, 1),
            options: { isWholeLine: true, linesDecorationsClassName: 'code-line-decoration' },
          },
        ]
      );
    }
    this.blameWidgets = blames.map((b, index) => {
      return new BlameWidget(b, index === 0, this.ed!);
    });
  }

  public destroyBlameWidgets() {
    if (this.blameWidgets) {
      this.blameWidgets.forEach((bw: BlameWidget) => bw.destroy());
    }
    if (this.lineDecorations) {
      this.ed!.deltaDecorations(this.lineDecorations!, []);
      this.lineDecorations = null;
    }
    this.blameWidgets = null;
    if (this.resizeChecker) {
      this.resizeChecker.destroy();
    }
  }

  private loadFile(code: string, language: string = 'text') {
    const container = document.getElementById('codeViewer') as HTMLElement;
    this.ed = monaco.editor.create(container, {
      value: code,
      language,
      readOnly: true,
      minimap: {
        enabled: false,
      },
      hover: {
        enabled: false,
      },
      contextmenu: false,
      selectOnLineNumbers: false,
      selectionHighlight: false,
      renderLineHighlight: 'none',
      scrollBeyondLastLine: false,
      renderIndentGuides: false,
      automaticLayout: false,
      lineDecorationsWidth: this.props.showBlame ? 316 : 16,
    });
    this.resizeChecker = new ResizeChecker(container);
    this.resizeChecker.on('resize', () => {
      setTimeout(() => {
        this.ed!.layout();
      });
    });
  }

  renderFileLoadingIndicator = () => {
    const fileName = this.props.file;
    return (
      <EuiPage restrictWidth>
        <EuiPageBody>
          <EuiPageContent verticalPosition="center" horizontalPosition="center">
            <EuiPageContentHeader>
              <EuiPageContentHeaderSection>
                <h2>{fileName} is loading...</h2>
              </EuiPageContentHeaderSection>
            </EuiPageContentHeader>
            <EuiPageContentBody>
              <EuiProgress size="s" color="primary" />
            </EuiPageContentBody>
          </EuiPageContent>
        </EuiPageBody>
      </EuiPage>
    );
  };
  render() {
    return (
      <EuiFlexGroup direction="row" className="codeContainer__blame" gutterSize="none">
        {this.state.loading && this.renderFileLoadingIndicator()}
        <div tabIndex={0} className="codeContainer__root" id="codeViewer" />
      </EuiFlexGroup>
    );
  }
}
