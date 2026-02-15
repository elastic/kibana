/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { DslField } from './dsl';

// Helper render with i18n provider
const renderI18n = (ui: React.ReactElement) => render(<I18nProvider>{ui}</I18nProvider>);

describe('DslField', () => {
  const makeInitialValue = (retention: string | undefined) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    retention ? ({ dsl: { data_retention: retention } } as any) : ({} as any);

  it('initializes from existing retention value', () => {
    const setLifecycle = jest.fn();
    const setSaveDisabled = jest.fn();
    renderI18n(
      <DslField
        initialValue={makeInitialValue('30d')}
        isDisabled={false}
        setLifecycle={setLifecycle}
        setSaveButtonDisabled={setSaveDisabled}
      />
    );
    const input = screen.getByTestId('streamsAppDslModalDaysField') as HTMLInputElement;
    expect(input.value).toBe('30');
    // Effect should have fired once with initial lifecycle value (30d)
    expect(setLifecycle).toHaveBeenCalledWith({ dsl: { data_retention: '30d' } });
    expect(setSaveDisabled).toHaveBeenLastCalledWith(false);
  });

  it('updates lifecycle and enables save on valid integer change', async () => {
    const setLifecycle = jest.fn();
    const setSaveDisabled = jest.fn();
    renderI18n(
      <DslField
        initialValue={makeInitialValue('30d')}
        isDisabled={false}
        setLifecycle={setLifecycle}
        setSaveButtonDisabled={setSaveDisabled}
      />
    );
    const input = screen.getByTestId('streamsAppDslModalDaysField') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '45' } });
    await waitFor(() => {
      expect(setLifecycle).toHaveBeenCalledWith({ dsl: { data_retention: '45d' } });
    });
    expect(setSaveDisabled).toHaveBeenLastCalledWith(false);
  });

  it('shows error and disables save for invalid values', async () => {
    const setLifecycle = jest.fn();
    const setSaveDisabled = jest.fn();
    renderI18n(
      <DslField
        initialValue={makeInitialValue('30d')}
        isDisabled={false}
        setLifecycle={setLifecycle}
        setSaveButtonDisabled={setSaveDisabled}
      />
    );
    const input = screen.getByTestId('streamsAppDslModalDaysField') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '0' } });
    await waitFor(() => {
      expect(screen.getByText(/positive integer is required/i)).toBeInTheDocument();
    });
    // Last call should disable save
    expect(setSaveDisabled).toHaveBeenLastCalledWith(true);
    // Should NOT issue lifecycle update for invalid value (latest call still for initial 30d)
    expect(setLifecycle).not.toHaveBeenCalledWith({ dsl: { data_retention: '0d' } });
  });

  it('changes unit via popover and updates lifecycle', async () => {
    const setLifecycle = jest.fn();
    const setSaveDisabled = jest.fn();
    renderI18n(
      <DslField
        initialValue={makeInitialValue('30d')}
        isDisabled={false}
        setLifecycle={setLifecycle}
        setSaveButtonDisabled={setSaveDisabled}
      />
    );
    const unitButton = screen.getByTestId('streamsAppDslModalButton');
    fireEvent.click(unitButton); // open popover
    const hoursUnitButton = screen.getByTestId('streamsAppDslModalUnitOption-h');
    fireEvent.click(hoursUnitButton); // Click Hours option
    await waitFor(() => {
      expect(setLifecycle).toHaveBeenCalledWith({ dsl: { data_retention: '30h' } });
    });
  });

  it('respects isDisabled prop, preventing edits', () => {
    const setLifecycle = jest.fn();
    const setSaveDisabled = jest.fn();
    renderI18n(
      <DslField
        initialValue={makeInitialValue('15d')}
        isDisabled={true}
        setLifecycle={setLifecycle}
        setSaveButtonDisabled={setSaveDisabled}
      />
    );
    const input = screen.getByTestId('streamsAppDslModalDaysField') as HTMLInputElement;
    expect(input).toBeDisabled();
    // Attempt change
    fireEvent.change(input, { target: { value: '20' } });
    expect(setLifecycle).not.toHaveBeenCalledWith({ dsl: { data_retention: '20d' } });
  });
});
