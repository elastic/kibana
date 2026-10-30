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
import { buildChangeHistoryMonacoTheme } from './monaco_theme';

const getEuiTheme = () =>
  renderHook(() => useEuiTheme(), {
    wrapper: ({ children }) => <TestProvider>{children}</TestProvider>,
  }).result.current;

describe('buildChangeHistoryMonacoTheme', () => {
  it('builds the EUI theme with transparent surfaces and EUI token colors', () => {
    const theme = getEuiTheme();
    const { colors } = buildChangeHistoryMonacoTheme(theme);

    expect(colors['editor.background']).toBe('#00000000');
    expect(colors['editorGutter.background']).toBe('#00000000');
    expect(colors['editorWidget.background']).toBe(theme.euiTheme.colors.backgroundBasePlain);
    expect(colors['editor.selectionBackground']).toMatch(/^#[0-9a-f]{6,8}$/i);
  });
});
