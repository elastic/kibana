/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { EuiThemeProvider } from '@elastic/eui';
import { FormattedValue, FormattedKey } from './formatted_value';

const renderWithTheme = (component: React.ReactNode) =>
  render(<EuiThemeProvider>{component}</EuiThemeProvider>);

describe('FormattedKey', () => {
  it('renders the key when value is present', () => {
    const { container } = renderWithTheme(<FormattedKey k="host.name" value="my-host" />);
    expect(container.textContent).toBe('host.name');
  });

  it('renders the key with subdued style when value is null', () => {
    const { container } = renderWithTheme(<FormattedKey k="host.name" value={null} />);
    expect(container.textContent).toBe('host.name');
    expect(container.querySelector('span')).not.toBeNull();
  });

  it('renders the key with subdued style when value is undefined', () => {
    const { container } = renderWithTheme(<FormattedKey k="host.name" value={undefined} />);
    expect(container.textContent).toBe('host.name');
    expect(container.querySelector('span')).not.toBeNull();
  });
});

const dateProps = {
  dateFormat: 'MMM D, YYYY @ HH:mm:ss.SSS',
  dateTimezone: 'Browser',
};

describe('FormattedValue', () => {
  it('renders object values as pretty-printed JSON', () => {
    const obj = { foo: 'bar', nested: { a: 1 } };
    const { container } = renderWithTheme(<FormattedValue value={obj} {...dateProps} />);
    expect(container.querySelector('pre')?.textContent).toBe(JSON.stringify(obj, null, 4));
  });

  it('renders boolean true as string', () => {
    const { container } = renderWithTheme(<FormattedValue value={true} {...dateProps} />);
    expect(container.textContent).toBe('true');
  });

  it('renders boolean false as string', () => {
    const { container } = renderWithTheme(<FormattedValue value={false} {...dateProps} />);
    expect(container.textContent).toBe('false');
  });

  it('renders number values as string', () => {
    const { container } = renderWithTheme(<FormattedValue value={42} {...dateProps} />);
    expect(container.textContent).toBe('42');
  });

  it('renders N/A for null values', () => {
    const { container } = renderWithTheme(<FormattedValue value={null} {...dateProps} />);
    expect(container.textContent).toBe('N/A');
  });

  it('renders N/A for empty string values', () => {
    const { container } = renderWithTheme(<FormattedValue value="" {...dateProps} />);
    expect(container.textContent).toBe('N/A');
  });

  it('formats date values with default settings', () => {
    const { container } = renderWithTheme(
      <FormattedValue value="2024-06-15T14:30:45.123Z" {...dateProps} />
    );
    expect(container.textContent).toMatch(/Jun 15, 2024 @ \d{2}:\d{2}:45\.123/);
  });

  it('formats date values with custom settings', () => {
    const { container } = renderWithTheme(
      <FormattedValue
        value="2024-06-15T14:30:45.123+01:00"
        dateFormat="HH:mm:ss.SSS"
        dateTimezone="UTC"
      />
    );
    expect(container.textContent).toMatch('13:30:45.123');
  });

  it.each([['hello world'], ['synth-service-2'], ['1.3.4'], ['1234567'], ['service-1']])(
    'renders plain string "%s" as-is',
    (value) => {
      const { container } = renderWithTheme(<FormattedValue value={value} {...dateProps} />);
      expect(container.textContent).toBe(value);
    }
  );
});
