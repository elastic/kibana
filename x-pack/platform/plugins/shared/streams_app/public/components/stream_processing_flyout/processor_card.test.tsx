/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import type { UnitSignal } from '../../services/unit_pipeline';
import { ProcessorCard } from './processor_card';

const renderCard = (signals: UnitSignal[]) =>
  render(
    <EuiProvider>
      <ProcessorCard
        step={{
          key: 'step-0',
          status: 'saved',
          processor: {
            id: 'add-fields-1',
            type: 'add_fields',
            supported_telemetry: signals,
            config: [
              {
                name: 'fields',
                value: [{ action: 'upsert', location: 'attributes', name: 'team', value: 'core' }],
              },
            ],
          },
        }}
        displayName="Add fields"
        diagnostics={[]}
        editable
        isFirst
        isLast
        onEdit={jest.fn()}
        onDelete={jest.fn()}
        onDuplicate={jest.fn()}
        onMoveUp={jest.fn()}
        onMoveDown={jest.fn()}
      />
    </EuiProvider>
  );

describe('ProcessorCard', () => {
  it('shows a badge for each signal the processor applies to, worded as in routing', () => {
    renderCard(['logs', 'docs']);

    expect(screen.getByTestId('streamsProcessingFlyoutStepSummary').textContent).toBe(
      'upsert attributes.team = "core"'
    );
    expect(screen.getByTestId('streamsProcessingFlyoutStepSignal-logs').textContent).toBe('Logs');
    expect(screen.getByTestId('streamsProcessingFlyoutStepSignal-docs').textContent).toBe('Docs');
  });

  it('shows no signal badges for a processor that enables none', () => {
    renderCard([]);

    expect(screen.getByTestId('streamsProcessingFlyoutStepSummary')).toBeTruthy();
    expect(screen.queryByTestId(/^streamsProcessingFlyoutStepSignal-/)).toBeNull();
  });
});
