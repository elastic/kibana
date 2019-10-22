/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { editor } from 'monaco-editor';
import React from 'react';
import { MonacoDiffEditor } from '../../monaco/monaco_diff_editor';

interface Props {
  originCode: string;
  modifiedCode: string;
  language: string;
  renderSideBySide: boolean;
}

export class DiffEditor extends React.Component<Props> {
  lineHeight = 18;
  static linesCount(s: string = '') {
    let count = 0;
    let position = 0;
    while (position !== -1) {
      count++;
      position = position + 1;
      position = s.indexOf('\n', position);
    }
    return count;
  }
  private diffEditor: MonacoDiffEditor | null = null;
  public mountDiffEditor = (container: HTMLDivElement) => {
    this.diffEditor = new MonacoDiffEditor(
      container,
      this.props.originCode,
      this.props.modifiedCode,
      this.props.language,
      this.props.renderSideBySide
    );
    this.diffEditor.init();
  };

  getEditorHeight = () => {
    const originalLinesCount = DiffEditor.linesCount(this.props.originCode);
    const modifiedLinesCount = DiffEditor.linesCount(this.props.modifiedCode);
    return Math.min(Math.max(originalLinesCount, modifiedLinesCount) * this.lineHeight, 400);
  };

  public componentDidUpdate(prevProps: Props) {
    if (prevProps.renderSideBySide !== this.props.renderSideBySide) {
      this.updateLayout(this.props.renderSideBySide);
    }
  }

  public updateLayout(renderSideBySide: boolean) {
    this.diffEditor!.diffEditor!.updateOptions({ renderSideBySide } as editor.IDiffEditorOptions);
  }

  public render() {
    return (
      <div
        id="diffEditor"
        className="codeContainer__monaco"
        ref={this.mountDiffEditor}
        style={{ height: this.getEditorHeight() }}
      />
    );
  }
}
