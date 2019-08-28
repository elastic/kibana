/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
// (1) Desired editor features:
import 'monaco-editor/esm/vs/editor/browser/controller/coreCommands.js';
import 'monaco-editor/esm/vs/editor/browser/widget/codeEditorWidget.js';
import 'monaco-editor/esm/vs/editor/browser/widget/diffEditorWidget.js';
// import 'monaco-editor/esm/vs/editor/browser/widget/diffNavigator.js';
// import 'monaco-editor/esm/vs/editor/contrib/bracketMatching/bracketMatching.js';
// import 'monaco-editor/esm/vs/editor/contrib/caretOperations/caretOperations.js';
// import 'monaco-editor/esm/vs/editor/contrib/caretOperations/transpose.js';
import 'monaco-editor/esm/vs/editor/contrib/clipboard/clipboard.js';
// import 'monaco-editor/esm/vs/editor/contrib/codelens/codelensController.js';
// import 'monaco-editor/esm/vs/editor/contrib/colorPicker/colorDetector.js';
// import 'monaco-editor/esm/vs/editor/contrib/comment/comment.js';
// import 'monaco-editor/esm/vs/editor/contrib/contextmenu/contextmenu.js';
// import 'monaco-editor/esm/vs/editor/contrib/cursorUndo/cursorUndo.js';
// import 'monaco-editor/esm/vs/editor/contrib/dnd/dnd.js';
import 'monaco-editor/esm/vs/editor/contrib/find/findController.js';
import 'monaco-editor/esm/vs/editor/contrib/folding/folding.js';
// import 'monaco-editor/esm/vs/editor/contrib/format/formatActions.js';
import 'monaco-editor/esm/vs/editor/contrib/goToDefinition/goToDefinitionCommands';
import 'monaco-editor/esm/vs/editor/contrib/goToDefinition/goToDefinitionMouse';
// import 'monaco-editor/esm/vs/editor/contrib/gotoError/gotoError.js';
// import 'monaco-editor/esm/vs/editor/contrib/hover/hover.js';
// import 'monaco-editor/esm/vs/editor/contrib/inPlaceReplace/inPlaceReplace.js';
// import 'monaco-editor/esm/vs/editor/contrib/linesOperations/linesOperations.js';
// import 'monaco-editor/esm/vs/editor/contrib/links/links.js';
// import 'monaco-editor/esm/vs/editor/contrib/multicursor/multicursor.js';
// import 'monaco-editor/esm/vs/editor/contrib/parameterHints/parameterHints.js';
// import 'monaco-editor/esm/vs/editor/contrib/quickFix/quickFixCommands.js';
// import 'monaco-editor/esm/vs/editor/contrib/referenceSearch/referenceSearch.js';
// import 'monaco-editor/esm/vs/editor/contrib/rename/rename.js';
// import 'monaco-editor/esm/vs/editor/contrib/smartSelect/smartSelect.js';
// import 'monaco-editor/esm/vs/editor/contrib/snippet/snippetController2.js';
// import 'monaco-editor/esm/vs/editor/contrib/suggest/suggestController.js';
// import 'monaco-editor/esm/vs/editor/contrib/toggleTabFocusMode/toggleTabFocusMode.js';
// import 'monaco-editor/esm/vs/editor/contrib/wordHighlighter/wordHighlighter.js';
// import 'monaco-editor/esm/vs/editor/contrib/wordOperations/wordOperations.js';
// import 'monaco-editor/esm/vs/editor/standalone/browser/accessibilityHelp/accessibilityHelp.js';
// import 'monaco-editor/esm/vs/editor/standalone/browser/inspectTokens/inspectTokens.js';
// import 'monaco-editor/esm/vs/editor/standalone/browser/iPadShowKeyboard/iPadShowKeyboard.js';
// import 'monaco-editor/esm/vs/editor/standalone/browser/quickOpen/quickOutline.js';
// import 'monaco-editor/esm/vs/editor/standalone/browser/quickOpen/gotoLine.js';
// import 'monaco-editor/esm/vs/editor/standalone/browser/quickOpen/quickCommand.js';
// import 'monaco-editor/esm/vs/editor/standalone/browser/toggleHighContrast/toggleHighContrast.js';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api.js';

import darkTheme from '@elastic/eui/dist/eui_theme_dark.json';
import lightTheme from '@elastic/eui/dist/eui_theme_light.json';
// (2) Desired languages:
// import 'monaco-editor/esm/vs/language/typescript/monaco.contribution';
// import 'monaco-editor/esm/vs/language/css/monaco.contribution';
// import 'monaco-editor/esm/vs/language/json/monaco.contribution';
// import 'monaco-editor/esm/vs/language/html/monaco.contribution';
// import 'monaco-editor/esm/vs/basic-languages/bat/bat.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/coffee/coffee.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/cpp/cpp.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/csharp/csharp.contribution.js';
// import 'monaco-editor/esm/vs/basic-languages/csp/csp.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/css/css.contribution.js';
// import 'monaco-editor/esm/vs/basic-languages/dockerfile/dockerfile.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/fsharp/fsharp.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/go/go.contribution.js';
// import 'monaco-editor/esm/vs/basic-languages/handlebars/handlebars.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/html/html.contribution.js';
// import 'monaco-editor/esm/vs/basic-languages/ini/ini.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/java/java.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/r/r.contribution.js';
// import 'monaco-editor/esm/vs/basic-languages/razor/razor.contribution.js';
// import 'monaco-editor/esm/vs/basic-languages/redis/redis.contribution.js';
// import 'monaco-editor/esm/vs/basic-languages/redshift/redshift.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/ruby/ruby.contribution.js';
// import 'monaco-editor/esm/vs/basic-languages/sb/sb.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/scss/scss.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/solidity/solidity.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/sql/sql.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/swift/swift.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/vb/vb.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/xml/xml.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/yaml/yaml.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/javascript/javascript.contribution';
import 'monaco-editor/esm/vs/basic-languages/less/less.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/lua/lua.contribution.js';
// import 'monaco-editor/esm/vs/basic-languages/markdown/markdown.contribution.js';
// import 'monaco-editor/esm/vs/basic-languages/msdax/msdax.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/mysql/mysql.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/objective-c/objective-c.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/pgsql/pgsql.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/php/php.contribution.js';
// import 'monaco-editor/esm/vs/basic-languages/postiats/postiats.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/powershell/powershell.contribution.js';
// import 'monaco-editor/esm/vs/basic-languages/pug/pug.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/python/python.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/typescript/typescript.contribution';
import chrome from 'ui/chrome';
import { npStart } from 'ui/new_platform';

import { CTAGS_SUPPORT_LANGS } from '../../common/language_server';
import { definitionProvider } from './definition/definition_provider';

const IS_DARK_THEME = npStart.core.uiSettings.get('theme:darkMode');

const themeName = IS_DARK_THEME ? darkTheme : lightTheme;

const syntaxTheme = {
  keyword: themeName.euiColorAccent,
  comment: themeName.euiColorDarkShade,
  delimiter: themeName.euiColorSecondary,
  string: themeName.euiColorPrimary,
  number: themeName.euiColorWarning,
  regexp: themeName.euiColorPrimary,
  types: `${IS_DARK_THEME ? themeName.euiColorVis5 : themeName.euiColorVis9}`,
  annotation: themeName.euiColorLightShade,
  tag: themeName.euiColorAccent,
  symbol: themeName.euiColorDanger,
  foreground: themeName.euiColorDarkestShade,
  editorBackground: themeName.euiColorEmptyShade,
  lineNumbers: themeName.euiColorDarkShade,
  editorIndentGuide: themeName.euiColorLightShade,
  selectionBackground: `${IS_DARK_THEME ? '#343551' : '#E3E4ED'}`,
  editorWidgetBackground: themeName.euiColorLightestShade,
  editorWidgetBorder: themeName.euiColorLightShade,
  findMatchBackground: themeName.euiColorWarning,
  findMatchHighlightBackground: themeName.euiColorWarning,
};

monaco.editor.defineTheme('euiColors', {
  base: 'vs',
  inherit: true,
  rules: [
    {
      token: '',
      foreground: themeName.euiColorDarkestShade,
      background: themeName.euiColorEmptyShade,
    },
    { token: 'invalid', foreground: themeName.euiColorAccent },
    { token: 'emphasis', fontStyle: 'italic' },
    { token: 'strong', fontStyle: 'bold' },

    { token: 'variable', foreground: themeName.euiColorPrimary },
    { token: 'variable.predefined', foreground: themeName.euiColorSecondary },
    { token: 'constant', foreground: themeName.euiColorAccent },
    { token: 'comment', foreground: themeName.euiColorMediumShade },
    { token: 'number', foreground: themeName.euiColorWarning },
    { token: 'number.hex', foreground: themeName.euiColorPrimary },
    { token: 'regexp', foreground: themeName.euiColorDanger },
    { token: 'annotation', foreground: themeName.euiColorMediumShade },
    { token: 'type', foreground: themeName.euiColorVis0 },

    { token: 'delimiter', foreground: themeName.euiColorDarkestShade },
    { token: 'delimiter.html', foreground: themeName.euiColorDarkShade },
    { token: 'delimiter.xml', foreground: themeName.euiColorPrimary },

    { token: 'tag', foreground: themeName.euiColorDanger },
    { token: 'tag.id.jade', foreground: themeName.euiColorPrimary },
    { token: 'tag.class.jade', foreground: themeName.euiColorPrimary },
    { token: 'meta.scss', foreground: themeName.euiColorAccent },
    { token: 'metatag', foreground: themeName.euiColorSecondary },
    { token: 'metatag.content.html', foreground: themeName.euiColorDanger },
    { token: 'metatag.html', foreground: themeName.euiColorMediumShade },
    { token: 'metatag.xml', foreground: themeName.euiColorMediumShade },
    { token: 'metatag.php', fontStyle: 'bold' },

    { token: 'key', foreground: themeName.euiColorWarning },
    { token: 'string.key.json', foreground: themeName.euiColorDanger },
    { token: 'string.value.json', foreground: themeName.euiColorPrimary },

    { token: 'attribute.name', foreground: themeName.euiColorDanger },
    { token: 'attribute.name.css', foreground: themeName.euiColorSecondary },
    { token: 'attribute.value', foreground: themeName.euiColorPrimary },
    { token: 'attribute.value.number', foreground: themeName.euiColorWarning },
    { token: 'attribute.value.unit', foreground: themeName.euiColorWarning },
    { token: 'attribute.value.html', foreground: themeName.euiColorPrimary },
    { token: 'attribute.value.xml', foreground: themeName.euiColorPrimary },

    { token: 'string', foreground: themeName.euiColorLightestShade },
    { token: 'string.html', foreground: themeName.euiColorPrimary },
    { token: 'string.sql', foreground: themeName.euiColorDanger },
    { token: 'string.yaml', foreground: themeName.euiColorPrimary },

    { token: 'keyword', foreground: themeName.euiColorPrimary },
    { token: 'keyword.json', foreground: themeName.euiColorPrimary },
    { token: 'keyword.flow', foreground: themeName.euiColorWarning },
    { token: 'keyword.flow.scss', foreground: themeName.euiColorPrimary },

    { token: 'operator.scss', foreground: themeName.euiColorDarkShade },
    { token: 'operator.sql', foreground: themeName.euiColorMediumShade },
    { token: 'operator.swift', foreground: themeName.euiColorMediumShade },
    { token: 'predefined.sql', foreground: themeName.euiColorMediumShade },
  ],
  colors: {
    'editor.foreground': syntaxTheme.foreground,
    'editor.background': syntaxTheme.editorBackground,
    'editorLineNumber.foreground': syntaxTheme.lineNumbers,
    'editorLineNumber.activeForeground': syntaxTheme.lineNumbers,
    'editorIndentGuide.background': syntaxTheme.editorIndentGuide,
    'editor.selectionBackground': syntaxTheme.selectionBackground,
    'editorWidget.border': syntaxTheme.editorWidgetBorder,
    'editorWidget.background': syntaxTheme.editorWidgetBackground,
  },
});
monaco.editor.setTheme('euiColors');

monaco.languages.registerDefinitionProvider('java', definitionProvider);
monaco.languages.registerDefinitionProvider('typescript', definitionProvider);
monaco.languages.registerDefinitionProvider('javascript', definitionProvider);
if (chrome.getInjected('enableLangserversDeveloping', false) === true) {
  monaco.languages.registerDefinitionProvider('go', definitionProvider);
}
CTAGS_SUPPORT_LANGS.forEach(language =>
  monaco.languages.registerDefinitionProvider(language, definitionProvider)
);

export { monaco };
