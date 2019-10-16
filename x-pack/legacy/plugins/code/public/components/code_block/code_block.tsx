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
  lines: string[];
  language: string;
  /**
   * Returns whether to highlight the given line.
   * @param lineIndex The index of the line (0-based)
   */
  highlightLine: (lineIndex: number) => boolean;
  highlightRanges: IRange[];
  onClick: (event: Position) => void;
  folding: boolean;
  /**
   * Returns the line number to display for a given line.
   * @param lineIndex The index of the line (0-based)
   */
  lineNumber: (lineIndex: number) => string;
}

export class CodeBlock extends React.PureComponent<Props> {
  static defaultProps = {
    folding: false,
    highlightLine: () => {},
    highlightRanges: [],
    language: 'text',
    lineNumber: String,
    onClick: () => {},
  };

  private el = createRef<HTMLDivElement>();
  private ed?: editor.IStandaloneCodeEditor;
  private resizeChecker?: ResizeChecker;
  private currentDecorations: string[] = [];

  public async componentDidMount() {
    const { language, onClick } = this.props;

    if (this.el.current) {
      await this.tryLoadFile(this.text, language);
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

      this.setDecorations();

      this.resizeChecker = new ResizeChecker(this.el.current!);
      this.resizeChecker.on('resize', () => {
        setTimeout(() => {
          this.ed!.layout();
        });
      });
    }
  }

  private async tryLoadFile(text: string, language: string) {
    try {
      await monaco.editor.colorize(text, language, {});
      this.loadFile(text, language);
    } catch (e) {
      this.loadFile(text);
    }
  }

  private loadFile(text: string, language: string = 'text') {
    this.ed = monaco.editor.create(this.el.current!, {
      value: text,
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
    const { highlightRanges } = this.props;
    const prevText = prevProps.lines.join('\n');

    if (prevText !== this.text || prevProps.highlightRanges !== highlightRanges) {
      if (this.ed) {
        const model = this.ed.getModel();
        if (model) {
          model.setValue(this.text);
          this.setDecorations();
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
    const height = this.props.lines.length * 18;

    return <div ref={this.el} className="codeContainer__monaco" style={{ height }} />;
  }

  private lineNumber = (lineIndex: number) => this.props.lineNumber(lineIndex - 1);

  private get text(): string {
    return this.props.lines.join('\n');
  }

  private setDecorations() {
    const decorations = this.decorations;
    if (decorations.length) {
      this.currentDecorations = this.ed!.deltaDecorations(this.currentDecorations, decorations);
    }
  }

  private get decorations(): editor.IModelDeltaDecoration[] {
    const { lines, highlightRanges, highlightLine } = this.props;

    const rangeHighlights = highlightRanges.map(range => ({
      range,
      options: {
        inlineClassName: 'codeSearch__highlight',
      },
    }));

    const lineHighlights = lines
      .map((line, lineIndex) => ({
        range: new monaco.Range(lineIndex + 1, 0, lineIndex + 1, 0),
        options: {
          isWholeLine: true,
          className: 'codeBlock__line--highlighted',
          linesDecorationsClassName: 'codeBlock__line--highlighted',
        },
      }))
      .filter((decorations, lineIndex) => highlightLine(lineIndex));

    return [...rangeHighlights, ...lineHighlights];
  }
}
