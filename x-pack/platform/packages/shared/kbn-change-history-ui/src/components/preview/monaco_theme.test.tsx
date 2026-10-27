/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import React from 'react';
import { useEuiTheme } from '@elastic/eui';
import { TestProvider } from '../../test_utils/test_providers';
import { createChangeHistoryEuiMonacoTheme, euiChangeHistoryMonacoTheme } from './monaco_theme';

const getEuiTheme = () =>
  renderHook(() => useEuiTheme(), {
    wrapper: ({ children }) => <TestProvider>{children}</TestProvider>,
  }).result.current;

describe('createChangeHistoryEuiMonacoTheme', () => {
  it('builds the EUI theme with transparent surfaces and EUI token colors', () => {
    const theme = getEuiTheme();
    const { colors } = euiChangeHistoryMonacoTheme.getDefinition(theme);

    expect(euiChangeHistoryMonacoTheme.id).toBe('change-history-eui');
    expect(colors['editor.background']).toBe('#00000000');
    expect(colors['editorGutter.background']).toBe('#00000000');
    expect(colors['editorWidget.background']).toBe(theme.euiTheme.colors.backgroundBasePlain);
    expect(colors['editor.selectionBackground']).toMatch(/^#[0-9a-f]{6,8}$/i);
  });

  it('lets consumers extend the theme and choose a distinct id', () => {
    const theme = getEuiTheme();
    const custom = createChangeHistoryEuiMonacoTheme({
      id: 'my-theme',
      extend: (themeData, { euiTheme }) => ({
        ...themeData,
        colors: { ...themeData.colors, 'editor.background': euiTheme.colors.backgroundBasePlain },
        rules: [...themeData.rules, { token: 'string', foreground: 'ff0000' }],
      }),
    });

    const definition = custom.getDefinition(theme);

    expect(custom.id).toBe('my-theme');
    expect(definition.colors['editor.background']).toBe(theme.euiTheme.colors.backgroundBasePlain);
    expect(definition.colors['editorGutter.background']).toBe('#00000000');
    expect(definition.rules).toContainEqual({ token: 'string', foreground: 'ff0000' });
  });
});
