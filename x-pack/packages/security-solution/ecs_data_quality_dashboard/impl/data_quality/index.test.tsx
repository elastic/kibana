/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DARK_THEME } from '@elastic/charts';
import { render, screen } from '@testing-library/react';
import React from 'react';

import { TestExternalProviders } from './mock/test_providers/test_providers';
import { DataQualityPanel } from '.';
import { notificationServiceMock } from '@kbn/core-notifications-browser-mocks';

const { toasts } = notificationServiceMock.createSetupContract();

describe('DataQualityPanel', () => {
  beforeEach(() => {
    render(
      <TestExternalProviders>
        <DataQualityPanel
          canUserCreateAndReadCases={jest.fn()}
          defaultBytesFormat={''}
          defaultNumberFormat={''}
          httpFetch={jest.fn()}
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
      </TestExternalProviders>
    );
  });

  test('it renders the body', () => {
    expect(screen.getByTestId('body')).toBeInTheDocument();
  });
});
