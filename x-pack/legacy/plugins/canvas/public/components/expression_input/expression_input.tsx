/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { EuiFormRow } from '@elastic/eui';
import { debounce } from 'lodash';
import * as monacoEditor from 'monaco-editor/esm/vs/editor/editor.api';

import { CodeEditor } from '../../../../../../../src/plugins/kibana_react/public';

import { CanvasFunction } from '../../../types';
import {
  AutocompleteSuggestion,
  getAutocompleteSuggestions,
  getFnArgDefAtPosition,
} from '../../../common/lib/autocomplete';

import { LANGUAGE_ID } from '../../lib/monaco_language_def';

import { getFunctionReferenceStr, getArgReferenceStr } from './reference';

interface Props {
  /** Font size of text within the editor */

  /** Canvas function defintions */
  functionDefinitions: CanvasFunction[];

  /** Optional string for displaying error messages */
  error?: string;
  /** Value of expression */
  value: string;
  /** Function invoked when expression value is changed */
  onChange: (value?: string) => void;
  /** In full screen mode or not */
  isCompact: boolean;
}

export class ExpressionInput extends React.Component<Props> {
  static propTypes = {
    functionDefinitions: PropTypes.array.isRequired,

    value: PropTypes.string.isRequired,
    error: PropTypes.string,
    onChange: PropTypes.func.isRequired,
  };

  editor: monacoEditor.editor.IStandaloneCodeEditor | null;

  undoHistory: string[];
  redoHistory: string[];

  constructor(props: Props) {
    super(props);

    this.undoHistory = [];
    this.redoHistory = [];

    this.editor = null;
  }

  undo() {
    if (!this.undoHistory.length) {
      return;
    }
    const value = this.undoHistory.pop();
    this.redoHistory.push(this.props.value);
    this.props.onChange(value);
  }

  redo() {
    if (!this.redoHistory.length) {
      return;
    }
    const value = this.redoHistory.pop();
    this.undoHistory.push(this.props.value);
    this.props.onChange(value);
  }

  stash = debounce(
    (value: string) => {
      this.undoHistory.push(value);
      this.redoHistory = [];
    },
    500,
    { leading: true, trailing: false }
  );
  onKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          this.redo();
        } else {
          this.undo();
        }
      }
      if (e.key === 'y') {
        e.preventDefault();
        this.redo();
      }
    }
  };

  onChange = (value: string) => {
    this.updateState({ value });
  };

  updateState = ({ value }: { value: string }) => {
    this.stash(this.props.value);

    this.props.onChange(value);
  };

  provideSuggestions = (model: monacoEditor.editor.ITextModel, position: monacoEditor.Position) => {
    const text = model.getValue();
    const textRange = model.getFullModelRange();

    const lengthAfterPosition = model.getValueLengthInRange({
      startLineNumber: position.lineNumber,
      startColumn: position.column,
      endLineNumber: textRange.endLineNumber,
      endColumn: textRange.endColumn,
    });

    const wordUntil = model.getWordUntilPosition(position);
    const wordRange = new monacoEditor.Range(
      position.lineNumber,
      wordUntil.startColumn,
      position.lineNumber,
      wordUntil.endColumn
    );

    const aSuggestions = getAutocompleteSuggestions(
      this.props.functionDefinitions,
      text,
      text.length - lengthAfterPosition
    );

    const suggestions = aSuggestions.map((s: AutocompleteSuggestion) => {
      if (s.type === 'argument') {
        return {
          label: s.argDef.name,
          kind: monacoEditor.languages.CompletionItemKind.Field,
          documentation: { value: getArgReferenceStr(s.argDef), isTrusted: true },
          insertText: s.text,
          command: {
            title: 'Trigger Suggestion Dialog',
            id: 'editor.action.triggerSuggest',
          },
          range: wordRange,
        };
      } else if (s.type === 'value') {
        return {
          label: s.text,
          kind: monacoEditor.languages.CompletionItemKind.Value,
          insertText: s.text,
          command: {
            title: 'Trigger Suggestion Dialog',
            id: 'editor.action.triggerSuggest',
          },
          range: wordRange,
        };
      } else {
        return {
          label: s.fnDef.name,
          kind: monacoEditor.languages.CompletionItemKind.Function,
          documentation: {
            value: getFunctionReferenceStr(s.fnDef),
            isTrusted: true,
          },
          insertText: s.text,
          command: {
            title: 'Trigger Suggestion Dialog',
            id: 'editor.action.triggerSuggest',
          },
          range: wordRange,
        };
      }
    });

    return {
      suggestions,
    };
  };

  providerHover = (model: monacoEditor.editor.ITextModel, position: monacoEditor.Position) => {
    const text = model.getValue();
    const word = model.getWordAtPosition(position);

    if (!word) {
      return {
        contents: [],
      };
    }

    const absPosition = model.getValueLengthInRange({
      startLineNumber: 0,
      startColumn: 0,
      endLineNumber: position.lineNumber,
      endColumn: word.endColumn,
    });

    const { fnDef, argDef, argStart, argEnd } = getFnArgDefAtPosition(
      this.props.functionDefinitions,
      text,
      absPosition
    );

    if (argDef && argStart && argEnd) {
      // Use the start/end position of the arg to generate a complete range to highlight
      // that includes the arg name and its complete value
      const startPos = model.getPositionAt(argStart);
      const endPos = model.getPositionAt(argEnd);

      const argRange = new monacoEditor.Range(
        startPos.lineNumber,
        startPos.column,
        endPos.lineNumber,
        endPos.column
      );

      return {
        contents: [{ value: getArgReferenceStr(argDef), isTrusted: true }],
        range: argRange,
      };
    } else if (fnDef) {
      return {
        contents: [
          {
            value: getFunctionReferenceStr(fnDef),
            isTrusted: true,
          },
        ],
      };
    }

    return {
      contents: [],
    };
  };

  editorDidMount = (
    editor: monacoEditor.editor.IStandaloneCodeEditor,
    monaco: typeof monacoEditor
  ) => {
    // Updating tab size for the editor
    const model = editor.getModel();
    if (model) {
      model.updateOptions({ tabSize: 2 });
    }

    this.editor = editor;
  };

  render() {
    const { value, error, isCompact } = this.props;

    return (
      <div className="canvasExpressionInput">
        <EuiFormRow
          className="canvasExpressionInput__inner"
          fullWidth
          isInvalid={Boolean(error)}
          error={error}
        >
          <div className="canvasExpressionInput__editor">
            <CodeEditor
              languageId={LANGUAGE_ID}
              value={value}
              onChange={this.onChange}
              suggestionProvider={{
                triggerCharacters: [' '],
                provideCompletionItems: this.provideSuggestions,
              }}
              hoverProvider={{
                provideHover: this.providerHover,
              }}
              options={{
                fontSize: isCompact ? 12 : 16,
                scrollBeyondLastLine: false,
                quickSuggestions: true,
                minimap: {
                  enabled: false,
                },
                wordBasedSuggestions: false,
                wordWrap: 'on',
                wrappingIndent: 'indent',
              }}
              editorDidMount={this.editorDidMount}
            />
          </div>
        </EuiFormRow>
      </div>
    );
  }
}
