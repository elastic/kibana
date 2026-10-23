/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';

import { DataSchemaSection } from './data_schema_section';

function renderSection(props: Partial<React.ComponentProps<typeof DataSchemaSection>> = {}) {
  const onChange = jest.fn();
  render(
    <I18nProvider>
      <DataSchemaSection
        dataFormat="ecs"
        onChange={onChange}
        disabled={false}
        recommendedFormat="otel"
        {...props}
      />
    </I18nProvider>
  );
  return { onChange };
}

describe('DataSchemaSection', () => {
  it('renders the OpenTelemetry card as recommended and the ECS card', () => {
    renderSection();
    expect(screen.getByText('OpenTelemetry')).toBeTruthy();
    expect(screen.getByText('ECS')).toBeTruthy();
    const recommended = screen.getAllByText('Recommended');
    expect(recommended).toHaveLength(1);
    expect(recommended[0].closest('.euiCheckableCard')?.textContent).toContain('OpenTelemetry');
  });

  it('marks the ECS card as recommended when that is the default format', () => {
    renderSection({ recommendedFormat: 'ecs' });
    const recommended = screen.getAllByText('Recommended');
    expect(recommended).toHaveLength(1);
    expect(recommended[0].closest('.euiCheckableCard')?.textContent).toContain('ECS');
    expect(recommended[0].closest('.euiCheckableCard')?.textContent).not.toContain('OpenTelemetry');
  });

  it('shows the note about changing the schema after installation', () => {
    renderSection();
    expect(screen.getByTestId('servicesStep-dataSchemaSection').textContent).toContain(
      "This can't be changed after installation without creating a new integration policy."
    );
  });

  it('checks the card matching dataFormat', () => {
    renderSection({ dataFormat: 'otel' });
    const otel = screen.getByTestId('servicesStep-dataSchema-otel').querySelector('input');
    const ecs = screen.getByTestId('servicesStep-dataSchema-ecs').querySelector('input');
    expect(otel?.checked).toBe(true);
    expect(ecs?.checked).toBe(false);
  });

  it('calls onChange with the chosen format', () => {
    const { onChange } = renderSection({ dataFormat: 'ecs' });
    const otel = screen.getByTestId('servicesStep-dataSchema-otel').querySelector('input')!;
    fireEvent.click(otel);
    expect(onChange).toHaveBeenCalledWith('otel');
  });

  it('disables both cards when disabled', () => {
    renderSection({ disabled: true });
    const inputs = ['otel', 'ecs'].map((f) =>
      screen.getByTestId(`servicesStep-dataSchema-${f}`).querySelector('input')
    );
    expect(inputs.every((i) => i?.disabled)).toBe(true);
  });
});
