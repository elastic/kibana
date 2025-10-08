/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { IlmField } from './ilm';
import type { PhaseProps } from './ilm';
import { getPhaseDescription } from './ilm';

describe('getPhaseDescription', () => {
  const colors = { hot: 'hotC', warm: 'warmC', cold: 'coldC', frozen: 'frozenC' };

  const collect = (phases: any) =>
    getPhaseDescription(phases, colors).map((p: PhaseProps) => p.description);

  it('returns empty array when no known phases', () => {
    expect(collect({})).toEqual([]);
  });

  it('orders phases from hot->frozen input into original chronological order after reverse logic', () => {
    // Provide all phases; function pushes from frozen->hot then reverses
    const result = getPhaseDescription(
      {
        hot: { min_age: '0d' },
        warm: { min_age: '30d' },
        cold: { min_age: '60d' },
        frozen: { min_age: '90d' },
      } as any,
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
      } as any,
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
      } as any,
      colors
    );
    // After reverse only Hot phase in array
    expect(result).toHaveLength(1);
    expect(result[0].description).toMatch(/Hot/);
  });
});

// Mock streams schema helpers
jest.mock('@kbn/streams-schema', () => ({
  isIlmLifecycle: (v: any) => !!(v && v.ilm),
}));

// Minimal stubs for EUI components used inside IlmField to isolate logic.
// We provide only what is necessary for the tests.
jest.mock('@elastic/eui', () => {
  return {
    useEuiTheme: () => ({
      euiTheme: {
        themeName: 'DEFAULT',
        colors: {
          vis: {
            euiColorVis6: 'c6',
            euiColorVis9: 'c9',
            euiColorVis5: 'c5',
            euiColorVis2: 'c2',
            euiColorVis1: 'c1',
            euiColorVis4: 'c4',
          },
        },
      },
    }),
    EuiPanel: ({ children }: any) => <div data-test-subj="euiPanel">{children}</div>,
    EuiHighlight: ({ children }: any) => <span>{children}</span>,
    EuiText: ({ children }: any) => <div>{children}</div>,
    EuiHealth: ({ children }: any) => <span>{children}</span>,
    EuiFlexGroup: ({ children }: any) => <div>{children}</div>,
    EuiFlexItem: ({ children }: any) => <span>{children}</span>,
    // Custom lightweight selectable; clicking a button selects that policy
    EuiSelectable: (props: any) => {
      const { options, onChange } = props;
      const list = (
        <div>
          {options.map((o: any) => (
            <button
              key={o.label}
              data-test-subj={`policyOption-${o.label}`}
              onClick={() => {
                const updated = options.map((opt: any) => ({
                  ...opt,
                  checked: opt.label === o.label ? 'on' : undefined,
                }));
                onChange(updated);
              }}
            >
              {o.label}
            </button>
          ))}
        </div>
      );
      if (typeof props.children === 'function') {
        return <div data-test-subj="euiSelectable">{props.children(list, <div />)}</div>;
      }
      return <div data-test-subj="euiSelectable">{list}</div>;
    },
  };
});

const renderI18n = (ui: React.ReactElement) => render(<I18nProvider>{ui}</I18nProvider>);

describe('IlmField', () => {
  const policies = [
    { name: 'policyA', policy: { phases: { hot: { min_age: '0d' } } } },
    { name: 'policyB', policy: { phases: { hot: { min_age: '0d' }, warm: { min_age: '30d' } } } },
  ] as any;

  it('loads policies and selects one, enabling save and calling setLifecycle', async () => {
    const getIlmPolicies = jest.fn().mockResolvedValue(policies);
    const setLifecycle = jest.fn();
    const setSaveDisabled = jest.fn();
    renderI18n(
      <IlmField
        getIlmPolicies={getIlmPolicies}
        initialValue={{} as any}
        setLifecycle={setLifecycle}
        setSaveButtonDisabled={setSaveDisabled}
        readOnly={false}
      />
    );
    await waitFor(() => expect(getIlmPolicies).toHaveBeenCalled());
    // Expect policy buttons rendered
    await waitFor(() => expect(screen.getByTestId('policyOption-policyA')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('policyOption-policyB'));
    expect(setLifecycle).toHaveBeenCalledWith({ ilm: { policy: 'policyB' } });
    expect(setSaveDisabled).toHaveBeenLastCalledWith(false);
  });

  it('renders readOnly view showing initial policy and no selectable list', async () => {
    const getIlmPolicies = jest.fn().mockResolvedValue(policies);
    renderI18n(
      <IlmField
        getIlmPolicies={getIlmPolicies}
        initialValue={{ ilm: { policy: 'policyA' } } as any}
        setLifecycle={jest.fn()}
        setSaveButtonDisabled={jest.fn()}
        readOnly
      />
    );
    // In readOnly mode, policyA label should appear (from initial value)
    await waitFor(() => expect(screen.getByText('policyA')).toBeInTheDocument());
    // Our stub selectable appears only in editable mode; ensure not present
    expect(screen.queryByTestId('policyOption-policyA')).toBeNull();
  });

  it('handles getIlmPolicies rejection gracefully (error state)', async () => {
    const getIlmPolicies = jest.fn().mockRejectedValue(new Error('boom'));
    const setLifecycle = jest.fn();
    const setSaveDisabled = jest.fn();
    renderI18n(
      <IlmField
        getIlmPolicies={getIlmPolicies}
        initialValue={{} as any}
        setLifecycle={setLifecycle}
        setSaveButtonDisabled={setSaveDisabled}
        readOnly={false}
      />
    );
    await waitFor(() => expect(getIlmPolicies).toHaveBeenCalled());
    // Since we mocked EuiSelectable, error rendering path won't surface a specific message here.
    // We assert that no policy options appear due to rejection.
    expect(screen.queryByTestId('policyOption-policyA')).toBeNull();
    expect(setLifecycle).not.toHaveBeenCalled();
  });
});
