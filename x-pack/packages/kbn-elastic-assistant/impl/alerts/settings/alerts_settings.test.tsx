/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

import { AlertsSettings } from './alerts_settings';
import { KnowledgeBaseConfig } from '../../assistant/types';
import { DEFAULT_LATEST_ALERTS } from '../../assistant_context/constants';

describe('AlertsSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('updates the knowledgeBase settings when the switch is toggled', () => {
    const knowledgeBase: KnowledgeBaseConfig = {
      isEnabledRAGAlerts: false,
      isEnabledKnowledgeBase: false,
      latestAlerts: DEFAULT_LATEST_ALERTS,
    };
    const setUpdatedKnowledgeBaseSettings = jest.fn();

    render(
      <AlertsSettings
        knowledgeBase={knowledgeBase}
        setUpdatedKnowledgeBaseSettings={setUpdatedKnowledgeBaseSettings}
      />
    );

    const alertsSwitch = screen.getByTestId('alertsSwitch');
    fireEvent.click(alertsSwitch);

    expect(setUpdatedKnowledgeBaseSettings).toHaveBeenCalledWith({
      isEnabledRAGAlerts: true,
      isEnabledKnowledgeBase: false,
      latestAlerts: DEFAULT_LATEST_ALERTS,
    });
  });

  it('updates the knowledgeBase settings when the alerts range slider is changed', () => {
    const setUpdatedKnowledgeBaseSettings = jest.fn();
    const knowledgeBase: KnowledgeBaseConfig = {
      isEnabledRAGAlerts: true,
      isEnabledKnowledgeBase: false,
      latestAlerts: DEFAULT_LATEST_ALERTS,
    };

    render(
      <AlertsSettings
        knowledgeBase={knowledgeBase}
        setUpdatedKnowledgeBaseSettings={setUpdatedKnowledgeBaseSettings}
      />
    );

    const rangeSlider = screen.getByTestId('alertsRange');
    fireEvent.change(rangeSlider, { target: { value: '10' } });

    expect(setUpdatedKnowledgeBaseSettings).toHaveBeenCalledWith({
      isEnabledRAGAlerts: true,
      isEnabledKnowledgeBase: false,
      latestAlerts: 10,
    });
  });

  it('enables the alerts range slider when knowledgeBase.isEnabledRAGAlerts is true', () => {
    const setUpdatedKnowledgeBaseSettings = jest.fn();
    const knowledgeBase: KnowledgeBaseConfig = {
      isEnabledRAGAlerts: true, // <-- true
      isEnabledKnowledgeBase: false,
      latestAlerts: DEFAULT_LATEST_ALERTS,
    };

    render(
      <AlertsSettings
        knowledgeBase={knowledgeBase}
        setUpdatedKnowledgeBaseSettings={setUpdatedKnowledgeBaseSettings}
      />
    );

    expect(screen.getByTestId('alertsRange')).not.toBeDisabled();
  });

  it('disables the alerts range slider when knowledgeBase.isEnabledRAGAlerts is false', () => {
    const setUpdatedKnowledgeBaseSettings = jest.fn();
    const knowledgeBase: KnowledgeBaseConfig = {
      isEnabledRAGAlerts: false, // <-- false
      isEnabledKnowledgeBase: false,
      latestAlerts: DEFAULT_LATEST_ALERTS,
    };

    render(
      <AlertsSettings
        knowledgeBase={knowledgeBase}
        setUpdatedKnowledgeBaseSettings={setUpdatedKnowledgeBaseSettings}
      />
    );

    expect(screen.getByTestId('alertsRange')).toBeDisabled();
  });
});
