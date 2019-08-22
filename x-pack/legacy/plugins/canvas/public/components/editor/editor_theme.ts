/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as monacoEditor from 'monaco-editor/esm/vs/editor/editor.api';

import darkTheme from '@elastic/eui/dist/eui_theme_dark.json';
import lightTheme from '@elastic/eui/dist/eui_theme_light.json';

import chrome from 'ui/chrome';

// NOTE: For talk around where this theme information will ultimately live,
// please see this discuss issue: https://github.com/elastic/kibana/issues/43814

const IS_DARK_THEME = chrome.getUiSettingsClient().get('theme:darkMode');

const themeName = IS_DARK_THEME ? darkTheme : lightTheme;

const themeColors = {
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

export const theme: monacoEditor.editor.IStandaloneThemeData = {
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

    { token: 'string', foreground: themeName.euiColorDanger },
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
    'editor.foreground': themeColors.foreground,
    'editor.background': themeColors.editorBackground,
    'editorLineNumber.foreground': themeColors.lineNumbers,
    'editorLineNumber.activeForeground': themeColors.lineNumbers,
    'editorIndentGuide.background': themeColors.editorIndentGuide,
    'editor.selectionBackground': themeColors.selectionBackground,
    'editorWidget.border': themeColors.editorWidgetBorder,
    'editorWidget.background': themeColors.editorWidgetBackground,
  },
};
