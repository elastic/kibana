/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as monacoEditor from 'monaco-editor/esm/vs/editor/editor.api';

import darkTheme from '@elastic/eui/dist/eui_theme_dark.json';
import lightTheme from '@elastic/eui/dist/eui_theme_light.json';

// NOTE: For talk around where this theme information will ultimately live,
// please see this discuss issue: https://github.com/elastic/kibana/issues/43814

export function createTheme(
  euiTheme: typeof darkTheme | typeof lightTheme,
  selectionBackgroundColor: string
): monacoEditor.editor.IStandaloneThemeData {
  return {
    base: 'vs',
    inherit: true,
    rules: [
      {
        token: '',
        foreground: euiTheme.euiColorDarkestShade,
        background: euiTheme.euiColorEmptyShade,
      },
      { token: 'invalid', foreground: euiTheme.euiColorAccent },
      { token: 'emphasis', fontStyle: 'italic' },
      { token: 'strong', fontStyle: 'bold' },

      { token: 'variable', foreground: euiTheme.euiColorPrimary },
      { token: 'variable.predefined', foreground: euiTheme.euiColorSecondary },
      { token: 'constant', foreground: euiTheme.euiColorAccent },
      { token: 'comment', foreground: euiTheme.euiColorMediumShade },
      { token: 'number', foreground: euiTheme.euiColorAccent },
      { token: 'number.hex', foreground: euiTheme.euiColorAccent },
      { token: 'regexp', foreground: euiTheme.euiColorDanger },
      { token: 'annotation', foreground: euiTheme.euiColorMediumShade },
      { token: 'type', foreground: euiTheme.euiColorVis0 },

      { token: 'delimiter', foreground: euiTheme.euiColorDarkestShade },
      { token: 'delimiter.html', foreground: euiTheme.euiColorDarkShade },
      { token: 'delimiter.xml', foreground: euiTheme.euiColorPrimary },

      { token: 'tag', foreground: euiTheme.euiColorDanger },
      { token: 'tag.id.jade', foreground: euiTheme.euiColorPrimary },
      { token: 'tag.class.jade', foreground: euiTheme.euiColorPrimary },
      { token: 'meta.scss', foreground: euiTheme.euiColorAccent },
      { token: 'metatag', foreground: euiTheme.euiColorSecondary },
      { token: 'metatag.content.html', foreground: euiTheme.euiColorDanger },
      { token: 'metatag.html', foreground: euiTheme.euiColorMediumShade },
      { token: 'metatag.xml', foreground: euiTheme.euiColorMediumShade },
      { token: 'metatag.php', fontStyle: 'bold' },

      { token: 'key', foreground: euiTheme.euiColorWarning },
      { token: 'string.key.json', foreground: euiTheme.euiColorDanger },
      { token: 'string.value.json', foreground: euiTheme.euiColorPrimary },

      { token: 'attribute.name', foreground: euiTheme.euiColorDanger },
      { token: 'attribute.name.css', foreground: euiTheme.euiColorSecondary },
      { token: 'attribute.value', foreground: euiTheme.euiColorPrimary },
      { token: 'attribute.value.number', foreground: euiTheme.euiColorWarning },
      { token: 'attribute.value.unit', foreground: euiTheme.euiColorWarning },
      { token: 'attribute.value.html', foreground: euiTheme.euiColorPrimary },
      { token: 'attribute.value.xml', foreground: euiTheme.euiColorPrimary },

      { token: 'string', foreground: euiTheme.euiColorDanger },
      { token: 'string.html', foreground: euiTheme.euiColorPrimary },
      { token: 'string.sql', foreground: euiTheme.euiColorDanger },
      { token: 'string.yaml', foreground: euiTheme.euiColorPrimary },

      { token: 'keyword', foreground: euiTheme.euiColorPrimary },
      { token: 'keyword.json', foreground: euiTheme.euiColorPrimary },
      { token: 'keyword.flow', foreground: euiTheme.euiColorWarning },
      { token: 'keyword.flow.scss', foreground: euiTheme.euiColorPrimary },

      { token: 'operator.scss', foreground: euiTheme.euiColorDarkShade },
      { token: 'operator.sql', foreground: euiTheme.euiColorMediumShade },
      { token: 'operator.swift', foreground: euiTheme.euiColorMediumShade },
      { token: 'predefined.sql', foreground: euiTheme.euiColorMediumShade },
    ],
    colors: {
      'editor.foreground': euiTheme.euiColorDarkestShade,
      'editor.background': euiTheme.euiColorEmptyShade,
      'editorLineNumber.foreground': euiTheme.euiColorDarkShade,
      'editorLineNumber.activeForeground': euiTheme.euiColorDarkShade,
      'editorIndentGuide.background': euiTheme.euiColorLightShade,
      'editor.selectionBackground': selectionBackgroundColor,
      'editorWidget.border': euiTheme.euiColorLightShade,
      'editorWidget.background': euiTheme.euiColorLightestShade,
    },
  };
}

const DARK_THEME = createTheme(darkTheme, '#343551');
const LIGHT_THEME = createTheme(lightTheme, '#E3E4ED');

export { DARK_THEME, LIGHT_THEME };
