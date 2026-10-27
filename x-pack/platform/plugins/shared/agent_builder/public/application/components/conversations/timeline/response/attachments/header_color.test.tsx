/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook } from '@testing-library/react';
import { EuiProvider, useEuiTheme } from '@elastic/eui';
import type { HeaderColor } from '@kbn/agent-builder-browser/attachments';
import { useHeaderColorTokens } from './header_color';

const renderTokens = (color?: HeaderColor) =>
  renderHook(
    () => ({
      tokens: useHeaderColorTokens(color),
      plainBorder: useEuiTheme().euiTheme.colors.borderBasePlain,
    }),
    { wrapper: ({ children }) => <EuiProvider>{children}</EuiProvider> }
  ).result.current;

describe('useHeaderColorTokens', () => {
  it('returns the plain border and no text color when no color is set', () => {
    const { tokens, plainBorder } = renderTokens();

    expect(tokens).toEqual({ border: plainBorder });
  });

  it.each<HeaderColor>(['primary', 'danger', 'warning', 'accent', 'success'])(
    'returns a distinct border and text color for %s',
    (color) => {
      const { tokens, plainBorder } = renderTokens(color);

      expect(tokens.border).not.toBe(plainBorder);
      expect(tokens.text).toBeDefined();
    }
  );
});
