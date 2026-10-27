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

/** A Monaco theme the preview registers itself, built from the current EUI theme. */
export interface ChangeHistoryMonacoThemeDefinition {
  id: string;
  getDefinition: (theme: UseEuiTheme) => monaco.editor.IStandaloneThemeData;
}

/** Either the id of an already registered Monaco theme, or a definition to register. */
export type ChangeHistoryMonacoTheme = string | ChangeHistoryMonacoThemeDefinition;

export interface CreateChangeHistoryEuiMonacoThemeOptions {
  /** Theme id. Defaults to `change-history-eui`; use a distinct id when registering a variant. */
  id?: string;
  /** Adjusts the EUI-based theme, e.g. to override colors or add token rules. */
  extend?: (
    themeData: monaco.editor.IStandaloneThemeData,
    theme: UseEuiTheme
  ) => monaco.editor.IStandaloneThemeData;
}

const buildEuiThemeData = (
  themeBase: ThemeBase,
  euiTheme: EuiThemeComputed
): monaco.editor.IStandaloneThemeData => ({
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
    'editor.hoverHighlightBackground': chroma(transparentize(euiTheme.colors.primary, 0.15)).hex(),
    'editorLineNumber.foreground': euiTheme.colors.textSubdued,
    'editorLineNumber.activeForeground': euiTheme.colors.textSubdued,
    'editorIndentGuide.background1': euiTheme.colors.backgroundLightText,
    'editorIndentGuide.activeBackground1': euiTheme.colors.borderBaseDisabled,
    // Transparent backgrounds: the editor container behind provides the surface color.
    'editor.background': TRANSPARENT,
    'editor.selectionBackground': chroma(transparentize(euiTheme.colors.primary, 0.1)).hex(),
    'editor.wordHighlightTextBackground': chroma(
      transparentize(euiTheme.colors.primary, 0.1)
    ).hex(),
    'editor.wordHighlightBackground': chroma(transparentize(euiTheme.colors.primary, 0.1)).hex(),
    'editor.wordHighlightStrongBackground': chroma(
      transparentize(euiTheme.colors.primary, 0.1)
    ).hex(),
    'editorGutter.background': TRANSPARENT,
    'editorGutter.foldingControlForeground': euiTheme.colors.textSubdued,
    'minimap.background': TRANSPARENT,
    'diffEditor.unchangedRegionBackground': TRANSPARENT,
    'diffEditor.unchangedRegionForeground': euiTheme.colors.textSubdued,
  },
});

/**
 * Creates an EUI token driven Monaco theme definition. Pass `extend` to customize the result
 * (override colors, add rules) without rebuilding the palette.
 */
export const createChangeHistoryEuiMonacoTheme = ({
  id = 'change-history-eui',
  extend,
}: CreateChangeHistoryEuiMonacoThemeOptions = {}): ChangeHistoryMonacoThemeDefinition => ({
  id,
  getDefinition: (theme) => {
    const themeData = buildEuiThemeData(
      defaultThemesResolvers[CODE_EDITOR_DEFAULT_THEME_ID](theme),
      theme.euiTheme
    );
    return extend ? extend(themeData, theme) : themeData;
  },
});

/** Default theme for the preview. */
export const euiChangeHistoryMonacoTheme = createChangeHistoryEuiMonacoTheme();

/**
 * Resolves the Monaco theme id for the preview, registering it when a definition is given.
 * Defaults to the EUI theme.
 */
export const useResolveChangeHistoryMonacoTheme = (
  theme: ChangeHistoryMonacoTheme = euiChangeHistoryMonacoTheme
): string => {
  const euiThemeContext = useEuiTheme();
  const definition = typeof theme === 'object' ? theme : undefined;

  useLayoutEffect(() => {
    if (!definition) {
      return;
    }

    monaco.editor.defineTheme(definition.id, definition.getDefinition(euiThemeContext));
  }, [definition, euiThemeContext]);

  return typeof theme === 'string' ? theme : theme.id;
};
