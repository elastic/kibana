/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transparentize, useEuiTheme } from '@elastic/eui';
import chroma from 'chroma-js';
import { useLayoutEffect } from 'react';
import type { KbnCodeEditorChromeOverrides } from '@kbn/code-editor';
import { CODE_EDITOR_DEFAULT_THEME_ID, initializeRegisteredLanguagesTheme } from '@kbn/code-editor';

const TRANSPARENT = 'transparent';

/**
 * Per-instance chrome for change history Monaco editors, applied as inline CSS custom properties
 * on the editor's own DOM nodes so the global Monaco theme is left untouched.
 */
export const changeHistoryEditorChromeOverrides: KbnCodeEditorChromeOverrides = ({ euiTheme }) => {
  const selectionColor = chroma(transparentize(euiTheme.colors.primary, 0.1)).hex();

  return {
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
    'editor.hoverHighlightBackground': chroma(transparentize(euiTheme.colors.primary, 0.15)).hex(),
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
  };
};

/**
 * Registers the global Kibana Monaco theme before editors created with `monaco.editor.create*`
 * mount, and returns its id. Must be called before the editor-creating layout effect.
 */
export const useChangeHistoryMonacoTheme = (): string => {
  const euiThemeContext = useEuiTheme();

  useLayoutEffect(() => {
    initializeRegisteredLanguagesTheme(euiThemeContext);
  }, [euiThemeContext]);

  return CODE_EDITOR_DEFAULT_THEME_ID;
};
