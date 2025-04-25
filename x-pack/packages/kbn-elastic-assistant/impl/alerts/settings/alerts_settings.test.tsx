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

  it('updates the knowledgeBase settings when the alerts range slider is changed', () => {
    const setUpdatedKnowledgeBaseSettings = jest.fn();
    const knowledgeBase: KnowledgeBaseConfig = {
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
      latestAlerts: 10,
    });
  });
});
