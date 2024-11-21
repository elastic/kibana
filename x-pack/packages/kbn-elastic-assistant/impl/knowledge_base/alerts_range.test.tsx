/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { AlertsRange } from './alerts_range';
import {
  MAX_LATEST_ALERTS,
  MIN_LATEST_ALERTS,
} from '../assistant/settings/alerts_settings/alerts_settings';
import { KnowledgeBaseConfig } from '../assistant/types';

const nonDefaultMin = MIN_LATEST_ALERTS + 5000;
const nonDefaultMax = nonDefaultMin + 5000;

describe('AlertsRange', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders the expected default min alerts', () => {
    render(<AlertsRange value={200} />);

    expect(screen.getByText(`${MIN_LATEST_ALERTS}`)).toBeInTheDocument();
  });

  it('renders the expected NON-default min alerts', () => {
    render(
      <AlertsRange maxAlerts={nonDefaultMax} minAlerts={nonDefaultMin} value={nonDefaultMin} />
    );

    expect(screen.getByText(`${nonDefaultMin}`)).toBeInTheDocument();
  });

  it('renders the expected default max alerts', () => {
    render(<AlertsRange value={200} />);

    expect(screen.getByText(`${MAX_LATEST_ALERTS}`)).toBeInTheDocument();
  });

  it('renders the expected NON-default max alerts', () => {
    render(
      <AlertsRange maxAlerts={nonDefaultMax} minAlerts={nonDefaultMin} value={nonDefaultMax} />
    );

    expect(screen.getByText(`${nonDefaultMax}`)).toBeInTheDocument();
  });

  it('calls onChange when the range value changes', () => {
    const mockOnChange = jest.fn();
    render(<AlertsRange onChange={mockOnChange} value={MIN_LATEST_ALERTS} />);

    fireEvent.click(screen.getByText(`${MAX_LATEST_ALERTS}`));

    expect(mockOnChange).toHaveBeenCalled();
  });

  it('calls setUpdatedKnowledgeBaseSettings with the expected arguments', () => {
    const mockSetUpdatedKnowledgeBaseSettings = jest.fn();
    const knowledgeBase: KnowledgeBaseConfig = { latestAlerts: 150 };

    render(
      <AlertsRange
        knowledgeBase={knowledgeBase}
        setUpdatedKnowledgeBaseSettings={mockSetUpdatedKnowledgeBaseSettings}
        value={MIN_LATEST_ALERTS}
      />
    );

    fireEvent.click(screen.getByText(`${MAX_LATEST_ALERTS}`));

    expect(mockSetUpdatedKnowledgeBaseSettings).toHaveBeenCalledWith({
      ...knowledgeBase,
      latestAlerts: MAX_LATEST_ALERTS,
    });
  });

  it('renders with the correct initial value', () => {
    render(<AlertsRange value={250} />);

    expect(screen.getByTestId('alertsRange')).toHaveValue('250');
  });
});
