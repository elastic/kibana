/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DARK_THEME } from '@elastic/charts';
import { render, screen } from '@testing-library/react';
import React from 'react';

import { TestProviders } from './mock/test_providers';
import { DataQualityPanel } from '.';

describe('DataQualityPanel', () => {
  describe('when no ILM phases are provided', () => {
    const ilmPhases: string[] = [];

    beforeEach(() => {
      render(
        <TestProviders>
          <DataQualityPanel
            addSuccessToast={jest.fn()}
            canUserCreateAndReadCases={jest.fn()}
            defaultNumberFormat={''}
            getGroupByFieldsOnClick={jest.fn()}
            ilmPhases={ilmPhases}
            lastChecked={''}
            openCreateCaseFlyout={jest.fn()}
            patterns={[]}
            setLastChecked={jest.fn()}
            theme={DARK_THEME}
          />
        </TestProviders>
      );
    });

    test('it renders the ILM phases empty prompt', () => {
      expect(screen.getByTestId('ilmPhasesEmptyPrompt')).toBeInTheDocument();
    });

    test('it does NOT render the body', () => {
      expect(screen.queryByTestId('body')).not.toBeInTheDocument();
    });
  });

  describe('when ILM phases are provided', () => {
    const ilmPhases: string[] = ['hot', 'warm', 'unmanaged'];

    beforeEach(() => {
      render(
        <TestProviders>
          <DataQualityPanel
            addSuccessToast={jest.fn()}
            canUserCreateAndReadCases={jest.fn()}
            defaultNumberFormat={''}
            getGroupByFieldsOnClick={jest.fn()}
            ilmPhases={ilmPhases}
            lastChecked={''}
            openCreateCaseFlyout={jest.fn()}
            patterns={[]}
            setLastChecked={jest.fn()}
            theme={DARK_THEME}
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
});
