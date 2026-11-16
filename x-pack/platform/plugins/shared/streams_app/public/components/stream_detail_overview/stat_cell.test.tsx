/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EuiProvider, useEuiTheme } from '@elastic/eui';
import { StatCell } from './stat_cell';

const ThemeColors = ({ onTheme }: { onTheme: (colors: Record<string, string>) => void }) => {
  const { euiTheme } = useEuiTheme();
  onTheme(euiTheme.colors as unknown as Record<string, string>);
  return null;
};

describe('StatCell', () => {
  it.each([
    ['success', 'successText'],
    ['warning', 'warningText'],
    ['danger', 'dangerText'],
    ['primary', 'primaryText'],
  ] as const)('uses the accessible text token for %s values', (valueColor, token) => {
    let colors: Record<string, string> = {};
    render(
      <EuiProvider>
        <ThemeColors onTheme={(c) => (colors = c)} />
        <StatCell title="Title" value="5%" valueColor={valueColor} />
      </EuiProvider>
    );

    expect(screen.getByText('5%')).toHaveStyle({ color: colors[token] });
  });
});
