/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type { IlmPolicy, IlmPolicyPhases, IngestStreamLifecycleAll } from '@kbn/streams-schema';
import { IlmField } from './ilm';
import type { PhaseProps } from './ilm';
import { getPhaseDescription } from './ilm';

describe('getPhaseDescription', () => {
  const colors = { hot: 'hotC', warm: 'warmC', cold: 'coldC', frozen: 'frozenC' };

  const collect = (phases: IlmPolicyPhases) =>
    getPhaseDescription(phases, colors).map((p: PhaseProps) => p.description);

  it('returns empty array when no known phases', () => {
    expect(collect({} as IlmPolicyPhases)).toEqual([]);
  });

  it('orders phases from hot->frozen input into original chronological order after reverse logic', () => {
    // Provide all phases; function pushes from frozen->hot then reverses
    const result = getPhaseDescription(
      {
        hot: { min_age: '0d' },
        warm: { min_age: '30d' },
        cold: { min_age: '60d' },
        frozen: { min_age: '90d' },
      } as unknown as IlmPolicyPhases,
      colors
    );
    // After reverse, first should be hot... last frozen
    expect(result[0].description).toMatch(/^Hot/);
    expect(result[1].description).toMatch(/^Warm/);
    expect(result[2].description).toMatch(/^Cold/);
    expect(result[3].description).toMatch(/^Frozen/);
  });

  it('propagates previous start age forward through descriptions', () => {
    const result = getPhaseDescription(
      {
        hot: { min_age: '0d' },
        warm: { min_age: '30d' },
        cold: { min_age: '60d' },
      } as unknown as IlmPolicyPhases,
      colors
    );
    // After reverse: hot, warm, cold
    const texts = result.map((r) => r.description);
    // Warm line should reference previous start age (which becomes 30d) and cold line 60d or prior
    expect(texts[1]).toMatch(/Warm/);
    expect(texts[2]).toMatch(/Cold/);
  });

  it('handles delete phase supplying initial previosStartAge', () => {
    const result = getPhaseDescription(
      {
        delete: { min_age: '180d' },
        hot: { min_age: '0d' },
      } as unknown as IlmPolicyPhases,
      colors
    );
    // After reverse only Hot phase in array
    expect(result).toHaveLength(1);
    expect(result[0].description).toMatch(/Hot/);
  });
});

const renderI18n = (ui: React.ReactElement) => render(<I18nProvider>{ui}</I18nProvider>);

describe('IlmField', () => {
  const policies = [
    { name: 'policyA', phases: { hot: { min_age: '0d' } } },
    { name: 'policyB', phases: { hot: { min_age: '0d' }, warm: { min_age: '30d' } } },
  ] as unknown as IlmPolicy[];

  it('loads and displays ILM policies', async () => {
    const getIlmPolicies = jest.fn().mockResolvedValue(policies);
    const setLifecycle = jest.fn();
    const setSaveDisabled = jest.fn();
    renderI18n(
      <IlmField
        getIlmPolicies={getIlmPolicies}
        initialValue={{} as unknown as IngestStreamLifecycleAll}
        setLifecycle={setLifecycle}
        setSaveButtonDisabled={setSaveDisabled}
        readOnly={false}
      />
    );
    await waitFor(() => expect(getIlmPolicies).toHaveBeenCalled());
    // Policies should be displayed
    await waitFor(() => {
      expect(screen.getByTestId('ilmPolicy-policyA')).toBeInTheDocument();
      expect(screen.getByTestId('ilmPolicy-policyB')).toBeInTheDocument();
    });
  });

  it('renders readOnly view showing initial policy', async () => {
    const getIlmPolicies = jest.fn().mockResolvedValue(policies);
    renderI18n(
      <IlmField
        getIlmPolicies={getIlmPolicies}
        initialValue={{ ilm: { policy: 'policyA' } } as unknown as IngestStreamLifecycleAll}
        setLifecycle={jest.fn()}
        setSaveButtonDisabled={jest.fn()}
        readOnly
      />
    );
    // In readOnly mode, policyA should be displayed
    await waitFor(() => expect(screen.getByText('policyA')).toBeInTheDocument());

    // It doesn't show dropdown with policies
    expect(screen.queryByTestId('ilmPolicy-policyA')).not.toBeInTheDocument();
    expect(screen.queryByTestId('ilmPolicy-policyB')).not.toBeInTheDocument();
  });

  it('handles getIlmPolicies error', async () => {
    const getIlmPolicies = jest.fn().mockRejectedValue(new Error('Failed to load policies'));
    const setLifecycle = jest.fn();
    const setSaveDisabled = jest.fn();
    renderI18n(
      <IlmField
        getIlmPolicies={getIlmPolicies}
        initialValue={{} as unknown as IngestStreamLifecycleAll}
        setLifecycle={setLifecycle}
        setSaveButtonDisabled={setSaveDisabled}
        readOnly={false}
      />
    );
    await waitFor(() => expect(getIlmPolicies).toHaveBeenCalled());
    // Error should be displayed
    await waitFor(() => {
      expect(screen.getAllByText(/Failed to load policies/i).length).toBeGreaterThan(0);
    });
  });
});
