/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../onboarding_flow_context', () => {
      const mocked = {
      useOnboardingFlow: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./use_services_step', () => {
      const mocked = {
      useServicesStep: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./data_format_select', () => {
      const mocked = {
      DataFormatSelect: ({ disabled }: { disabled: boolean }) => (
        <div data-test-subj="mock-data-format-select" data-disabled={String(disabled)} />
      ),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./service_row', () => {
      const mocked = { ServiceRow: () => null };
      return { ...mocked, default: mocked };
    });
vi.mock('../service_search_filter', () => {
      const mocked = { ServiceSearchFilter: () => null };
      return { ...mocked, default: mocked };
    });

import { useOnboardingFlow } from '../../onboarding_flow_context';
import { useServicesStep } from './use_services_step';
import { ServicesStep } from '.';

const mockUseOnboardingFlow = useOnboardingFlow as Mock;
const mockUseServicesStep = useServicesStep as Mock;

function makeServicesStepReturn(): ReturnType<typeof useServicesStep> {
  return {
    signalFilter: 'all',
    setSignalFilter: vi.fn(),
    searchQuery: '',
    setSearchQuery: vi.fn(),
    filteredServices: [],
    categories: [],
    activeCategory: 'analytics',
    setSelectedCategory: vi.fn(),
    servicesInCategory: [],
    duplicateNamesInCategory: new Set(),
    selectedSet: new Set(),
    categoryStats: new Map(),
    isReady: true,
    handleToggle: vi.fn(),
    allInCategorySelected: false,
    handleSelectAllInCategory: vi.fn(),
    handleDeselectAllInCategory: vi.fn(),
    handleNext: vi.fn(),
    dataFormat: 'ecs',
    setDataFormat: vi.fn(),
  };
}

function renderStep(initialEntries = ['/']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <I18nProvider>
        <ServicesStep onContinue={vi.fn()} />
      </I18nProvider>
    </MemoryRouter>
  );
}

describe('ServicesStep — isFormatDisabled', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
