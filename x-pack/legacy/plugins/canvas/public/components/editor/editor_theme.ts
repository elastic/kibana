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
    { token: 'number', foreground: themeName.euiColorAccent },
    { token: 'number.hex', foreground: themeName.euiColorAccent },
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
    'editor.foreground': themeName.euiColorDarkestShade,
    'editor.background': themeName.euiColorEmptyShade,
    'editorLineNumber.foreground': themeName.euiColorDarkShade,
    'editorLineNumber.activeForeground': themeName.euiColorDarkShade,
    'editorIndentGuide.background': themeName.euiColorLightShade,
    'editor.selectionBackground': `${IS_DARK_THEME ? '#343551' : '#E3E4ED'}`,
    'editorWidget.border': themeName.euiColorLightShade,
    'editorWidget.background': themeName.euiColorLightestShade,
  },
};
