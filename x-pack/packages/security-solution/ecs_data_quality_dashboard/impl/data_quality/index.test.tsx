/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DARK_THEME } from '@elastic/charts';
import { render, screen } from '@testing-library/react';
import React from 'react';

import { TestProviders } from './mock/test_providers/test_providers';
import { DataQualityPanel } from '.';
import { notificationServiceMock } from '@kbn/core-notifications-browser-mocks';

const { toasts } = notificationServiceMock.createSetupContract();

describe('DataQualityPanel', () => {
  describe('when ILM phases are provided', () => {
    const ilmPhases: string[] = ['hot', 'warm', 'unmanaged'];

    beforeEach(() => {
      render(
        <TestProviders>
          <DataQualityPanel
            canUserCreateAndReadCases={jest.fn()}
            defaultBytesFormat={''}
            defaultNumberFormat={''}
            getGroupByFieldsOnClick={jest.fn()}
            httpFetch={jest.fn()}
            ilmPhases={ilmPhases}
            isAssistantEnabled={true}
            isILMAvailable={true}
            lastChecked={''}
            openCreateCaseFlyout={jest.fn()}
            patterns={[]}
            reportDataQualityIndexChecked={jest.fn()}
            setLastChecked={jest.fn()}
            baseTheme={DARK_THEME}
            toasts={toasts}
          />
        </TestProviders>
      );
    });

    test('it does NOT render the ILM phases empty prompt', () => {
      expect(screen.queryByTestId('ilmPhasesEmptyPrompt')).not.toBeInTheDocument();
    });

    test('it renders the body', () => {
      expect(screen.getByTestId('body')).toBeInTheDocument();
    });
  });

  describe('when ILM phases are NOT provided', () => {
    test('it renders the ILM phases empty prompt', () => {
      const ilmPhases: string[] = [];

      render(
        <TestProviders>
          <DataQualityPanel
            canUserCreateAndReadCases={jest.fn()}
            defaultBytesFormat={''}
            defaultNumberFormat={''}
            getGroupByFieldsOnClick={jest.fn()}
            httpFetch={jest.fn()}
            ilmPhases={ilmPhases}
            isAssistantEnabled={true}
            isILMAvailable={true}
            lastChecked={''}
            openCreateCaseFlyout={jest.fn()}
            patterns={[]}
            reportDataQualityIndexChecked={jest.fn()}
            setLastChecked={jest.fn()}
            baseTheme={DARK_THEME}
            toasts={toasts}
          />
        </TestProviders>
      );

      expect(screen.getByTestId('ilmPhasesEmptyPrompt')).toBeInTheDocument();
    });
  });
});
