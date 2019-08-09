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

  public componentDidUpdate(prevProps: Props) {
    if (prevProps.renderSideBySide !== this.props.renderSideBySide) {
      this.updateLayout(this.props.renderSideBySide);
    }
  }

  public updateLayout(renderSideBySide: boolean) {
    this.diffEditor!.diffEditor!.updateOptions({ renderSideBySide } as editor.IDiffEditorOptions);
  }

  public render() {
    return <div id="diffEditor" ref={this.mountDiffEditor} style={{ height: 1000 }} />;
  }
}
