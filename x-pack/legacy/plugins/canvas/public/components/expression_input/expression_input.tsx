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

import { Editor } from '../editor';

// TODO: update when https://github.com/elastic/kibana/pull/42502 hits
// @ts-ignore untyped local
import {
  getAutocompleteSuggestions,
  getFnArgDefAtPosition,
} from '../../../common/lib/autocomplete';

import { language } from './expression_language';

// TODO: update and remove when https://github.com/elastic/kibana/pull/42502 hits
interface ArgDef {
  text: string;
  name: string;
}

interface FunctionDef {
  name: string;
  help: string;
  args: {
    [key: string]: ArgDef;
  };
  type: string;
}

interface Props {
  fontSize: number;
  isAutocompleteEnabled: boolean;

  error?: string;
  value: string;
  functionDefinitions: FunctionDef[];
  onChange: (value?: string) => void;
}

export class ExpressionInput extends React.Component<Props> {
  static propTypes = {
    functionDefinitions: PropTypes.array,
    value: PropTypes.string,
    onChange: PropTypes.func,
    error: PropTypes.string,
    isAutocompleteEnabled: PropTypes.bool,
  };

  undoHistory: string[];
  redoHistory: string[];
  editor: monacoEditor.editor.IStandaloneCodeEditor | null;

  constructor(props: Props) {
    super(props);

    this.editor = null;

    this.undoHistory = [];
    this.redoHistory = [];
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
    // find out if we are completing a property in the 'dependencies' object.
    const text = model.getValue();
    const textRange = model.getFullModelRange();

    const lengthAfterPosition = model.getValueLengthInRange({
      startLineNumber: position.lineNumber,
      startColumn: position.column,
      endLineNumber: textRange.endLineNumber,
      endColumn: textRange.endColumn,
    });

    const aSuggestions = getAutocompleteSuggestions(
      this.props.functionDefinitions,
      text,
      text.length - lengthAfterPosition
    );

    const suggestions = aSuggestions.map((s: any) => {
      if (s.type === 'argument') {
        const { aliases, types, default: def, required, help } = s.argDef;

        // Aliases, Types, Default, Required
        const doc = `**Aliases**: ${aliases.length ? aliases.join(' | ') : 'null'}, **Types**: ${
          types.length ? types.join(' | ') : 'null'
        }
\n\n${def != null ? '**Default**: ' + def + ', ' : ''}**Required**: ${String(Boolean(required))}
\n\n${help}`;

        return {
          label: s.argDef.name,
          kind: monacoEditor.languages.CompletionItemKind.Field,
          documentation: { value: doc, isTrusted: true },
          insertText: s.text,
          command: {
            id: 'editor.action.triggerSuggest',
          },
        };
      } else if (s.type === 'value') {
        return {
          label: s.text,
          kind: monacoEditor.languages.CompletionItemKind.Value,
          insertText: s.text,
          command: {
            id: 'editor.action.triggerSuggest',
          },
        };
      } else {
        const { help, context, type } = s.fnDef;
        const doc = `**Accepts**: ${
          context.types ? context.types.join(' | ') : 'null'
        }, **Returns**: ${type ? type : 'null'}
\n\n${help}`;

        return {
          label: s.fnDef.name,
          kind: monacoEditor.languages.CompletionItemKind.Function,
          documentation: {
            value: doc,
            isTrusted: true,
          },
          insertText: s.text,
          command: {
            id: 'editor.action.triggerSuggest',
          },
        };
      }
    });

    return {
      suggestions,
    };
  };

  render() {
    const { value, error, fontSize, functionDefinitions, isAutocompleteEnabled } = this.props;

    // TODO: I'm not sure we want to do this but waiting till we have function
    // definitions means we can easily get nice syntax highlighting on functions
    if (functionDefinitions.length === 0) {
      return null;
    }

    // TODO: Move this
    language.keywords = this.props.functionDefinitions.map(fn => fn.name);

    const helpText = error
      ? null
      : 'This is the coded expression that backs this element. You better know what you are doing here.';
    return (
      <div className="expressionInput">
        <EuiFormRow
          className="expressionInput--inner"
          fullWidth
          isInvalid={Boolean(error)}
          error={error}
          helpText={helpText}
        >
          <div style={{ minHeight: 250, flex: `'1 0 250px'` }}>
            <Editor
              languageId="expression"
              languageDef={language}
              value={value}
              onChange={this.onChange}
              suggestionProvider={{
                triggerCharacters: [' '],
                provideCompletionItems: this.provideSuggestions,
              }}
              options={{
                fontSize,
                scrollBeyondLastLine: false,
                quickSuggestions: isAutocompleteEnabled,
                minimap: {
                  enabled: false,
                },
                wordBasedSuggestions: false,
              }}
            />
          </div>
        </EuiFormRow>
      </div>
    );
  }
}
