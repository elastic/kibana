/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { editor as Editor, languages, Range as EditorRange } from 'monaco-editor';
// @ts-ignore
import { createCancelablePromise } from 'monaco-editor/esm/vs/base/common/async';
// @ts-ignore
import { getOccurrencesAtPosition } from 'monaco-editor/esm/vs/editor/contrib/wordHighlighter/wordHighlighter';

import React from 'react';
import ReactDOM from 'react-dom';
import { Hover, MarkedString, Range } from 'vscode-languageserver-types';
import { ServerNotInitialized } from '../../../common/lsp_error_codes';
import { HoverButtons } from '../../components/hover/hover_buttons';
import { HoverState, HoverWidget, HoverWidgetProps } from '../../components/hover/hover_widget';
import { ContentWidget } from '../content_widget';
import { monaco } from '../monaco';
import { Operation } from '../operation';
import { HoverComputer } from './hover_computer';

export class ContentHoverWidget extends ContentWidget {
  public static ID = 'editor.contrib.contentHoverWidget';
  private static readonly DECORATION_OPTIONS = {
    className: 'wordHighlightStrong', //  hoverHighlight wordHighlightStrong
  };
  private hoverOperation: Operation<Hover>;
  private readonly computer: HoverComputer;
  private lastRange: EditorRange | null = null;
  private shouldFocus: boolean = false;
  private hoverResultAction?: (hover: Hover) => void = undefined;
  private highlightDecorations: string[] = [];
  private hoverState: HoverState = HoverState.LOADING;

  constructor(editor: Editor.ICodeEditor) {
    super(ContentHoverWidget.ID, editor);
    this.containerDomNode.className = 'monaco-editor-hover hidden';
    this.containerDomNode.tabIndex = 0;
    this.domNode.className = 'monaco-editor-hover-content';
    this.computer = new HoverComputer();
    this.hoverOperation = new Operation(
      this.computer,
      result => this.result(result),
      error => {
        // @ts-ignore
        if (error.code === ServerNotInitialized) {
          this.hoverState = HoverState.INITIALIZING;
          this.render(this.lastRange!);
        }
      },
      () => {
        this.hoverState = HoverState.LOADING;
        this.render(this.lastRange!);
      }
    );
  }

  public startShowingAt(range: any, focus: boolean) {
    if (this.isVisible && this.lastRange && this.lastRange.containsRange(range)) {
      return;
    }
    this.hoverOperation.cancel();
    const url = this.editor.getModel()!.uri.toString();
    if (this.isVisible) {
      this.hide();
    }
    this.computer.setParams(url, range);
    this.hoverOperation.start();
    this.lastRange = range;
    this.shouldFocus = focus;
  }

  public setHoverResultAction(hoverResultAction: (hover: Hover) => void) {
    this.hoverResultAction = hoverResultAction;
  }

  public hide(): void {
    super.hide();
    this.highlightDecorations = this.editor.deltaDecorations(this.highlightDecorations, []);
  }

  private result(result: Hover) {
    if (this.hoverResultAction) {
      // pass the result to redux
      this.hoverResultAction(result);
    }
    if (this.lastRange && result && result.contents) {
      this.render(this.lastRange, result);
    } else {
      this.hide();
    }
  }

  private render(renderRange: EditorRange, result?: Hover) {
    const fragment = document.createDocumentFragment();
    let props: HoverWidgetProps = {
      state: this.hoverState,
      gotoDefinition: this.gotoDefinition.bind(this),
      findReferences: this.findReferences.bind(this),
    };
    let startColumn = renderRange.startColumn;
    if (result) {
      let contents: MarkedString[] = [];
      if (Array.isArray(result.contents)) {
        contents = result.contents;
      } else {
        contents = [result.contents as MarkedString];
      }
      contents = contents.filter(v => {
        if (typeof v === 'string') {
          return !!v;
        } else {
          return !!v.value;
        }
      });
      if (contents.length === 0) {
        this.hide();
        return;
      }
      props = {
        ...props,
        state: HoverState.READY,
        contents,
      };
      if (result.range) {
        this.lastRange = this.toMonacoRange(result.range);
        this.highlightOccurrences(this.lastRange);
      }
      startColumn = Math.min(
        renderRange.startColumn,
        result.range ? result.range.start.character + 1 : Number.MAX_VALUE
      );
    }

    this.showAt(new monaco.Position(renderRange.startLineNumber, startColumn), this.shouldFocus);
    const element = React.createElement(HoverWidget, props, null);
    // @ts-ignore
    ReactDOM.render(element, fragment);
    const buttonFragment = document.createDocumentFragment();
    const buttons = React.createElement(HoverButtons, props, null);
    // @ts-ignore
    ReactDOM.render(buttons, buttonFragment);
    this.updateContents(fragment, buttonFragment);
  }

  private toMonacoRange(r: Range): EditorRange {
    return new monaco.Range(
      r.start.line + 1,
      r.start.character + 1,
      r.end.line + 1,
      r.end.character + 1
    );
  }

  private gotoDefinition() {
    if (this.lastRange) {
      this.editor.setPosition({
        lineNumber: this.lastRange.startLineNumber,
        column: this.lastRange.startColumn,
      });
      const action = this.editor.getAction('editor.action.revealDefinition');
      action.run().then(() => this.hide());
    }
  }

  private findReferences() {
    if (this.lastRange) {
      this.editor.setPosition({
        lineNumber: this.lastRange.startLineNumber,
        column: this.lastRange.startColumn,
      });
      const action = this.editor.getAction('editor.action.referenceSearch.trigger');
      action.run().then(() => this.hide());
    }
  }

  private highlightOccurrences(range: EditorRange) {
    const pos = new monaco.Position(range.startLineNumber, range.startColumn);
    return createCancelablePromise((token: any) =>
      getOccurrencesAtPosition(this.editor.getModel(), pos, token).then(
        (data: languages.DocumentHighlight[]) => {
          if (data) {
            if (this.isVisible) {
              const decorations = data.map(h => ({
                range: h.range,
                options: ContentHoverWidget.DECORATION_OPTIONS,
              }));

              this.highlightDecorations = this.editor.deltaDecorations(
                this.highlightDecorations,
                decorations
              );
            }
          } else {
            this.highlightDecorations = this.editor.deltaDecorations(this.highlightDecorations, [
              {
                range,
                options: ContentHoverWidget.DECORATION_OPTIONS,
              },
            ]);
          }
        }
      )
    );
  }
}
