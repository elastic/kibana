/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { editor } from 'monaco-editor';
import chrome from 'ui/chrome';
import { ResizeChecker } from 'ui/resize_checker';
import { EditorActions } from '../components/editor/editor';
import { provideDefinition } from './definition/definition_provider';

import { toCanonicalUrl } from '../../common/uri_util';
import { EditorService } from './editor_service';
import { HoverController } from './hover/hover_controller';
import { monaco } from './monaco';
import { registerReferencesAction } from './references/references_action';
import { registerEditor } from './single_selection_helper';
import { TextModelResolverService } from './textmodel_resolver';

export class MonacoHelper {
  public get initialized() {
    return this.monaco !== null;
  }
  public decorations: string[] = [];
  public editor: editor.IStandaloneCodeEditor | null = null;
  private monaco: any | null = null;
  private resizeChecker: ResizeChecker | null = null;

  constructor(
    public readonly container: HTMLElement,
    private readonly editorActions: EditorActions,
    private urlQuery: string
  ) {
    this.handleCopy = this.handleCopy.bind(this);
  }
  public init() {
    return new Promise(resolve => {
      this.monaco = monaco;
      const definitionProvider = {
        provideDefinition(model: any, position: any) {
          return provideDefinition(monaco, model, position);
        },
      };
      this.monaco.languages.registerDefinitionProvider('java', definitionProvider);
      this.monaco.languages.registerDefinitionProvider('typescript', definitionProvider);
      this.monaco.languages.registerDefinitionProvider('javascript', definitionProvider);
      if (chrome.getInjected('enableLangserversDeveloping', false) === true) {
        this.monaco.languages.registerDefinitionProvider('go', definitionProvider);
      }
      const codeEditorService = new EditorService(this.getUrlQuery);
      codeEditorService.setMonacoHelper(this);
      this.editor = monaco.editor.create(
        this.container!,
        {
          readOnly: true,
          minimap: {
            enabled: false,
          },
          hover: {
            enabled: false, // disable default hover;
          },
          occurrencesHighlight: false,
          selectionHighlight: false,
          renderLineHighlight: 'none',
          contextmenu: false,
          folding: true,
          scrollBeyondLastLine: false,
          renderIndentGuides: false,
          automaticLayout: false,
          lineDecorationsWidth: 16,
        },
        {
          textModelService: new TextModelResolverService(monaco),
          codeEditorService,
        }
      );
      registerEditor(this.editor);
      this.resizeChecker = new ResizeChecker(this.container);
      this.resizeChecker.on('resize', () => {
        setTimeout(() => {
          this.editor!.layout();
        });
      });
      registerReferencesAction(this.editor, this.getUrlQuery);
      const hoverController: HoverController = new HoverController(this.editor);
      hoverController.setReduxActions(this.editorActions);
      document.addEventListener('copy', this.handleCopy);
      document.addEventListener('cut', this.handleCopy);
      resolve(this.editor);
    });
  }

  updateUrlQuery = (q: string) => {
    this.urlQuery = q;
  };

  getUrlQuery = () => {
    return this.urlQuery;
  };

  public destroy = () => {
    this.monaco = null;
    document.removeEventListener('copy', this.handleCopy);
    document.removeEventListener('cut', this.handleCopy);

    if (this.resizeChecker) {
      this.resizeChecker!.destroy();
    }
  };

  public async loadFile(
    repoUri: string,
    file: string,
    text: string,
    lang: string,
    revision: string = 'master'
  ) {
    if (!this.initialized) {
      await this.init();
    }
    const ed = this.editor!;
    const oldModel = ed.getModel();
    if (oldModel) {
      oldModel.dispose();
    }
    ed.setModel(null);
    const uri = this.monaco!.Uri.parse(
      toCanonicalUrl({ schema: 'git:', repoUri, file, revision, pathType: 'blob' })
    );
    let newModel = this.monaco!.editor.getModel(uri);
    if (!newModel) {
      newModel = this.monaco!.editor.createModel(text, lang, uri);
    } else {
      newModel.setValue(text);
    }
    ed.setModel(newModel);
    return ed;
  }

  public revealPosition(line: number, pos: number) {
    const position = {
      lineNumber: line,
      column: pos,
    };
    this.decorations = this.editor!.deltaDecorations(this.decorations, [
      {
        range: new this.monaco!.Range(line, 0, line, 0),
        options: {
          isWholeLine: true,
          className: `code-monaco-highlight-line code-line-number-${line}`,
          linesDecorationsClassName: 'code-mark-line-number',
        },
      },
    ]);
    this.editor!.setPosition(position);
    this.editor!.revealLineInCenterIfOutsideViewport(line);
  }

  public clearLineSelection() {
    if (this.editor) {
      this.decorations = this.editor.deltaDecorations(this.decorations, []);
    }
  }

  private handleCopy(e: any) {
    if (this.editor && this.editor.hasTextFocus() && this.editor.hasWidgetFocus()) {
      const selection = this.editor.getSelection();
      if (selection && !selection.isEmpty()) {
        const text = this.editor.getModel()!.getValueInRange(selection);
        e.clipboardData.setData('text/plain', text);
        e.preventDefault();
      }
    }
  }
}
