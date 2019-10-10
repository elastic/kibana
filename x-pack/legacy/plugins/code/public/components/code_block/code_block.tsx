/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { editor, IRange } from 'monaco-editor';
import React, { createRef } from 'react';

import { ResizeChecker } from '../shared/resize_checker';
import { monaco } from '../../monaco/monaco';
import { registerEditor } from '../../monaco/single_selection_helper';

export interface Position {
  lineNumber: string;
  column: number;
}

export interface Props {
  content: string;
  language: string;
  highlightRanges: IRange[];
  onClick: (event: Position) => void;
  folding: boolean;
  /**
   * Returns the line number to display for a given line.
   * @param lineIndex The index of the given line (0-indexed)
   */
  lineNumber: (lineIndex: number) => string;
}

export class CodeBlock extends React.PureComponent<Props> {
  static defaultProps = {
    folding: false,
    highlightRanges: [],
    language: 'text',
    lineNumber: String,
    onClick: () => {},
  };

  private el = createRef<HTMLDivElement>();
  private ed?: editor.IStandaloneCodeEditor;
  private resizeChecker?: ResizeChecker;
  private currentHighlightDecorations: string[] = [];

  public async componentDidMount() {
    const { content, highlightRanges, language, onClick } = this.props;

    if (this.el.current) {
      await this.tryLoadFile(content, language);
      this.ed!.onMouseDown((e: editor.IEditorMouseEvent) => {
        if (
          onClick &&
          (e.target.type === monaco.editor.MouseTargetType.GUTTER_LINE_NUMBERS ||
            e.target.type === monaco.editor.MouseTargetType.CONTENT_TEXT)
        ) {
          const position = e.target.position || { lineNumber: 0, column: 0 };
          const lineNumber = this.lineNumber(position.lineNumber);

          onClick({
            lineNumber,
            column: position.column,
          });
        }
      });
      registerEditor(this.ed!);

      if (highlightRanges.length) {
        const decorations = highlightRanges.map((range: IRange) => {
          return {
            range,
            options: {
              inlineClassName: 'codeSearch__highlight',
            },
          };
        });
        this.currentHighlightDecorations = this.ed!.deltaDecorations([], decorations);
      }
      this.resizeChecker = new ResizeChecker(this.el.current!);
      this.resizeChecker.on('resize', () => {
        setTimeout(() => {
          this.ed!.layout();
        });
      });
    }
  }

  private async tryLoadFile(code: string, language: string) {
    try {
      await monaco.editor.colorize(code, language, {});
      this.loadFile(code, language);
    } catch (e) {
      this.loadFile(code);
    }
  }

  private loadFile(code: string, language: string = 'text') {
    this.ed = monaco.editor.create(this.el.current!, {
      value: code,
      language,
      lineNumbers: this.lineNumber,
      readOnly: true,
      folding: this.props.folding,
      minimap: {
        enabled: false,
      },
      scrollbar: {
        vertical: 'hidden',
        handleMouseWheel: false,
        verticalScrollbarSize: 0,
      },
      hover: {
        enabled: false, // disable default hover;
      },
      contextmenu: false,
      selectOnLineNumbers: false,
      selectionHighlight: false,
      renderLineHighlight: 'none',
      renderIndentGuides: false,
      automaticLayout: false,
    });
  }

  public componentDidUpdate(prevProps: Readonly<Props>) {
    const { content, highlightRanges } = this.props;

    if (prevProps.content !== content || prevProps.highlightRanges !== highlightRanges) {
      if (this.ed) {
        const model = this.ed.getModel();
        if (model) {
          model.setValue(content);

          if (highlightRanges.length) {
            const decorations = highlightRanges!.map((range: IRange) => {
              return {
                range,
                options: {
                  inlineClassName: 'codeSearch__highlight',
                },
              };
            });
            this.currentHighlightDecorations = this.ed.deltaDecorations(
              this.currentHighlightDecorations,
              decorations
            );
          }
        }
      }
    }
  }

  public componentWillUnmount(): void {
    if (this.ed) {
      this.ed.dispose();
    }
  }

  public render() {
    const height = this.lines.length * 18;

    return <div ref={this.el} className="codeContainer__monaco" style={{ height }} />;
  }

  private lineNumber = (lineIndex: number) => this.props.lineNumber(lineIndex - 1);

  private get lines(): string[] {
    return this.props.content.split('\n');
  }
}
