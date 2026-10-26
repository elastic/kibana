/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiThemeComputed, UseEuiTheme } from '@elastic/eui';
import { transparentize, useEuiTheme } from '@elastic/eui';
import chroma from 'chroma-js';
import { useLayoutEffect } from 'react';
import { monaco } from '@kbn/code-editor';
import { CODE_EDITOR_DEFAULT_THEME_ID, defaultThemesResolvers } from '@kbn/monaco';

type ThemeBase = ReturnType<(typeof defaultThemesResolvers)[typeof CODE_EDITOR_DEFAULT_THEME_ID]>;

const TRANSPARENT = '#00000000';

export const CHANGE_HISTORY_MONACO_THEME_ID = 'change-history-eui';

const buildEuiThemeData = (
  themeBase: ThemeBase,
  euiTheme: EuiThemeComputed
): monaco.editor.IStandaloneThemeData => {
  const selectionColor = chroma(transparentize(euiTheme.colors.primary, 0.1)).hex();

  return {
    ...themeBase,
    colors: {
      ...themeBase.colors,
      'scrollbarSlider.background': euiTheme.colors.mediumShade,
      'scrollbarSlider.hoverBackground': euiTheme.colors.darkShade,
      'scrollbarSlider.activeBackground': euiTheme.colors.darkShade,
      'list.hoverForeground': euiTheme.colors.textPrimary,
      'list.hoverBackground': euiTheme.colors.backgroundBaseInteractiveSelect,
      'editorSuggestWidget.foreground': euiTheme.colors.textParagraph,
      'editorSuggestWidget.background': euiTheme.colors.backgroundBasePlain,
      'editorSuggestWidget.selectedForeground': euiTheme.colors.textPrimary,
      'editorSuggestWidget.selectedBackground': euiTheme.colors.backgroundBaseInteractiveSelect,
      'editorSuggestWidget.focusHighlightForeground': euiTheme.colors.primary,
      'editorSuggestWidget.border': euiTheme.colors.borderBaseSubdued,
      'list.focusForeground': euiTheme.colors.textPrimary,
      'list.focusBackground': euiTheme.colors.backgroundBaseInteractiveSelect,
      'list.activeSelectionForeground': euiTheme.colors.textPrimary,
      'list.activeSelectionBackground': euiTheme.colors.backgroundBaseInteractiveSelect,
      'editorWidget.foreground': euiTheme.colors.textParagraph,
      'editorWidget.background': euiTheme.colors.backgroundBasePlain,
      'editorWidget.border': euiTheme.colors.borderBaseSubdued,
      'editorHoverWidget.foreground': euiTheme.colors.textParagraph,
      'editorHoverWidget.background': euiTheme.colors.backgroundBasePlain,
      'editorHoverWidget.border': euiTheme.colors.borderBaseSubdued,
      'editor.hoverHighlightBackground': chroma(
        transparentize(euiTheme.colors.primary, 0.15)
      ).hex(),
      'editorLineNumber.foreground': euiTheme.colors.textSubdued,
      'editorLineNumber.activeForeground': euiTheme.colors.textSubdued,
      'editorIndentGuide.background1': euiTheme.colors.backgroundLightText,
      'editorIndentGuide.activeBackground1': euiTheme.colors.borderBaseDisabled,
      // Transparent backgrounds: the editor container behind provides the surface color.
      'editor.background': TRANSPARENT,
      'editor.selectionBackground': selectionColor,
      'editor.wordHighlightTextBackground': selectionColor,
      'editor.wordHighlightBackground': selectionColor,
      'editor.wordHighlightStrongBackground': selectionColor,
      'editorGutter.background': TRANSPARENT,
      'editorGutter.foldingControlForeground': euiTheme.colors.textSubdued,
      'minimap.background': TRANSPARENT,
      'diffEditor.unchangedRegionBackground': TRANSPARENT,
      'diffEditor.unchangedRegionForeground': euiTheme.colors.textSubdued,
    },
  };
};

export const buildChangeHistoryMonacoTheme = (
  theme: UseEuiTheme
): monaco.editor.IStandaloneThemeData =>
  buildEuiThemeData(defaultThemesResolvers[CODE_EDITOR_DEFAULT_THEME_ID](theme), theme.euiTheme);

/** Registers the EUI token driven Monaco theme and returns its id. */
export const useDefineChangeHistoryMonacoTheme = (): string => {
  const euiThemeContext = useEuiTheme();

  useLayoutEffect(() => {
    monaco.editor.defineTheme(
      CHANGE_HISTORY_MONACO_THEME_ID,
      buildChangeHistoryMonacoTheme(euiThemeContext)
    );
  }, [euiThemeContext]);

  return CHANGE_HISTORY_MONACO_THEME_ID;
};
