/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent } from '@testing-library/dom';

import { createFleetTestRendererMock } from '../../../../../../../mock';

import { AgentMigrateFlyout } from '.';

describe('MigrateAgentFlyout', () => {
  const renderer = createFleetTestRendererMock();
  let component: ReturnType<typeof renderer.render>;

  beforeEach(() => {
    component = renderer.render(
      <AgentMigrateFlyout
        onClose={jest.fn()}
        onSave={jest.fn()}
        agents={[
          {
            active: true,
            status: 'online',
            local_metadata: { elastic: { agent: { version: '8.8.0' } } },
            id: '1',
            packages: [],
            type: 'PERMANENT',
            enrolled_at: new Date().toISOString(),
          },
        ]}
      />
    );
  });
  it('should render', () => {
    expect(component).toBeDefined();
  });

  it('submit button should be disabled when form is invalid', () => {
    // set the value of the url
    const urlInput = component.getByTestId('migrateAgentFlyoutClusterUrlInput');
    fireEvent.change(urlInput, { target: { value: 'somebadurl.com' } });

    const submitButton = component.getByTestId('migrateAgentFlyoutSubmitButton');

    expect(submitButton).toBeDisabled();
  });

  it('submit button should be enabled when form is valid', () => {
    // set the value of the url
    const urlInput = component.getByTestId('migrateAgentFlyoutClusterUrlInput');
    fireEvent.change(urlInput, { target: { value: 'https://www.example.com' } });
    //  also set the value of enrollment token
    const tokenInput = component.getByTestId('migrateAgentFlyoutEnrollmentTokenInput');
    fireEvent.change(tokenInput, { target: { value: 'someToken' } });
    const submitButton = component.getByTestId('migrateAgentFlyoutSubmitButton');

    expect(submitButton).not.toBeDisabled();
  });
});
