/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import ReactResizeDetector from 'react-resize-detector';
import MonacoEditor, { EditorDidMount, EditorWillMount } from 'react-monaco-editor';
import * as monacoEditor from 'monaco-editor/esm/vs/editor/editor.api';
import 'monaco-editor/esm/vs/editor/contrib/suggest/suggestController.js'; // Needed for suggestions
import 'monaco-editor/esm/vs/editor/contrib/hover/hover.js'; // Needed for hover
import 'monaco-editor/esm/vs/editor/contrib/parameterHints/parameterHints.js'; // Needed for signature

import { theme } from './editor_theme';

interface Props {
  /**
   * Width of editor. Defaults to 100%.
   */
  width?: string | number;

  /**
   * Height of editor. Defaults to 500.
   */
  height?: string | number;

  languageId: string;
  languageDef:
    | monacoEditor.languages.IMonarchLanguage
    | PromiseLike<monacoEditor.languages.IMonarchLanguage>;

  value: string;
  onChange: (value: string) => void;

  options?: monacoEditor.editor.IEditorConstructionOptions;

  suggestionProvider?: monacoEditor.languages.CompletionItemProvider;
  signatureProvider?: monacoEditor.languages.SignatureHelpProvider;
  hoverProvider?: monacoEditor.languages.HoverProvider;

  editorWillMount?: EditorWillMount;
  overrideEditorWillMount?: EditorWillMount;

  editorDidMount?: EditorDidMount;
}

export class Editor extends React.Component<Props, {}> {
  editor: monacoEditor.editor.IStandaloneCodeEditor | null = null;

  editorWillMount = (monaco: typeof monacoEditor) => {
    if (this.props.overrideEditorWillMount) {
      this.props.overrideEditorWillMount(monaco);
      return;
    }

    // Setup on language handler here which registers all our code providers for the language
    // https://microsoft.github.io/monaco-editor/api/modules/monaco.languages.html#onlanguage

    monaco.languages.register({ id: this.props.languageId });
    monaco.languages.setMonarchTokensProvider(this.props.languageId, this.props.languageDef);

    monaco.languages.onLanguage(this.props.languageId, () => {
      if (this.props.suggestionProvider) {
        monaco.languages.registerCompletionItemProvider(
          this.props.languageId,
          this.props.suggestionProvider
        );
      }

      if (this.props.signatureProvider) {
        monaco.languages.registerSignatureHelpProvider(
          this.props.languageId,
          this.props.signatureProvider
        );
      }

      if (this.props.hoverProvider) {
        monaco.languages.registerHoverProvider(this.props.languageId, this.props.hoverProvider);
      }
    });

    // Register the lovely theme
    monaco.editor.defineTheme('euiColors', theme);

    if (this.props.editorWillMount) {
      this.props.editorWillMount(monaco);
    }
  };

  editorDidMount = (
    editor: monacoEditor.editor.IStandaloneCodeEditor,
    monaco: typeof monacoEditor
  ) => {
    this.editor = editor;

    if (this.props.editorDidMount) {
      this.props.editorDidMount(editor, monaco);
    }
  };

  render() {
    const { languageId, value, onChange, width, height, options } = this.props;

    return (
      <React.Fragment>
        <ReactResizeDetector
          handleWidth
          handleHeight
          skipOnMount
          onResize={this.updateDimensions}
        />
        <MonacoEditor
          theme="euiColors"
          language={languageId}
          value={value}
          onChange={onChange}
          editorWillMount={this.editorWillMount}
          editorDidMount={this.editorDidMount}
          width={width}
          height={height}
          options={options}
        />
      </React.Fragment>
    );
  }

  updateDimensions = () => {
    if (this.editor) {
      this.editor.layout();
    }
  };
}
