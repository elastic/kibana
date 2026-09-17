/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { MemoryRouter } from 'react-router-dom';

jest.mock('../../onboarding_flow_context', () => ({
  useOnboardingFlow: jest.fn(),
}));

jest.mock('./use_services_step', () => ({
  useServicesStep: jest.fn(),
}));

jest.mock('./data_format_select', () => ({
  DataFormatSelect: ({ disabled }: { disabled: boolean }) => (
    <div data-test-subj="mock-data-format-select" data-disabled={String(disabled)} />
  ),
}));

jest.mock('./service_row', () => ({ ServiceRow: () => null }));
jest.mock('../service_search_filter', () => ({ ServiceSearchFilter: () => null }));

import { useOnboardingFlow } from '../../onboarding_flow_context';
import { useServicesStep } from './use_services_step';
import { ServicesStep } from '.';

const mockUseOnboardingFlow = useOnboardingFlow as jest.Mock;
const mockUseServicesStep = useServicesStep as jest.Mock;

function makeServicesStepReturn(): ReturnType<typeof useServicesStep> {
  return {
    signalFilter: 'all',
    setSignalFilter: jest.fn(),
    searchQuery: '',
    setSearchQuery: jest.fn(),
    filteredServices: [],
    categories: [],
    activeCategory: 'analytics',
    setSelectedCategory: jest.fn(),
    servicesInCategory: [],
    duplicateNamesInCategory: new Set(),
    selectedSet: new Set(),
    categoryStats: new Map(),
    isReady: true,
    handleToggle: jest.fn(),
    allInCategorySelected: false,
    handleSelectAllInCategory: jest.fn(),
    handleDeselectAllInCategory: jest.fn(),
    handleNext: jest.fn(),
    dataFormat: 'ecs',
    setDataFormat: jest.fn(),
  };
}

function renderStep(initialEntries = ['/']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <I18nProvider>
        <ServicesStep onContinue={jest.fn()} />
      </I18nProvider>
    </MemoryRouter>
  );
}

describe('ServicesStep — isFormatDisabled', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseServicesStep.mockReturnValue(makeServicesStepReturn());
  });

  it('DataFormatSelect is enabled when no deploymentId param and no deploy state', () => {
    mockUseOnboardingFlow.mockReturnValue({
      detectAndReviewStep: { serviceStatuses: {}, policyIdsByInstance: {} },
    });
    renderStep(['/']);
    const el = screen.getByTestId('mock-data-format-select');
    expect(el.getAttribute('data-disabled')).toBe('false');
  });

  it('DataFormatSelect is disabled when ?deploymentId= is in URL', () => {
    mockUseOnboardingFlow.mockReturnValue({
      detectAndReviewStep: { serviceStatuses: {}, policyIdsByInstance: {} },
    });
    renderStep(['/?deploymentId=dep-123']);
    const el = screen.getByTestId('mock-data-format-select');
    expect(el.getAttribute('data-disabled')).toBe('true');
  });

  it('DataFormatSelect is disabled when serviceStatuses has entries (deploy started, SO may have failed)', () => {
    mockUseOnboardingFlow.mockReturnValue({
      detectAndReviewStep: {
        serviceStatuses: { ec2: 'instantiating' },
        policyIdsByInstance: {},
      },
    });
    renderStep(['/']);
    const el = screen.getByTestId('mock-data-format-select');
    expect(el.getAttribute('data-disabled')).toBe('true');
  });

  it('DataFormatSelect is disabled when policyIdsByInstance has entries', () => {
    mockUseOnboardingFlow.mockReturnValue({
      detectAndReviewStep: {
        serviceStatuses: {},
        policyIdsByInstance: { ec2: 'policy-123' },
      },
    });
    renderStep(['/']);
    const el = screen.getByTestId('mock-data-format-select');
    expect(el.getAttribute('data-disabled')).toBe('true');
  });
});
