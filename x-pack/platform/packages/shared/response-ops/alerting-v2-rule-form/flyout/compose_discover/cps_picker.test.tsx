/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { useRuleFormServices } from '../../form/contexts/rule_form_context';
import { CpsPicker } from './cps_picker';

jest.mock('../../form/contexts/rule_form_context', () => ({
  useRuleFormServices: jest.fn(),
}));

jest.mock('@kbn/cps-utils', () => ({
  useFetchProjects: jest.fn(() => []),
  ProjectPickerContent: () => <div data-test-subj="projectPickerContent" />,
}));

const mockUseRuleFormServices = jest.mocked(useRuleFormServices);

const mockCpsManager = {
  getTotalProjectCount: jest.fn(),
  getDefaultProjectRouting: jest.fn(() => undefined),
  fetchProjects: jest.fn(() => Promise.resolve(null)),
};

const renderPicker = () =>
  render(
    <IntlProvider locale="en">
      <CpsPicker />
    </IntlProvider>
  );

describe('CpsPicker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when the cps service is absent', () => {
    mockUseRuleFormServices.mockReturnValue({} as ReturnType<typeof useRuleFormServices>);

    const { container } = renderPicker();

    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when the project count is 1 or less', () => {
    mockCpsManager.getTotalProjectCount.mockReturnValue(1);
    mockUseRuleFormServices.mockReturnValue({
      cps: { cpsManager: mockCpsManager },
    } as unknown as ReturnType<typeof useRuleFormServices>);

    const { container } = renderPicker();

    expect(container).toBeEmptyDOMElement();
  });

  it('renders the picker button when there are multiple CPS projects', () => {
    mockCpsManager.getTotalProjectCount.mockReturnValue(2);
    mockUseRuleFormServices.mockReturnValue({
      cps: { cpsManager: mockCpsManager },
    } as unknown as ReturnType<typeof useRuleFormServices>);

    renderPicker();

    expect(screen.getByTestId('querySandboxCpsPicker')).toBeInTheDocument();
  });

  it('opens the popover and shows the project picker when the button is clicked', () => {
    mockCpsManager.getTotalProjectCount.mockReturnValue(2);
    mockUseRuleFormServices.mockReturnValue({
      cps: { cpsManager: mockCpsManager },
    } as unknown as ReturnType<typeof useRuleFormServices>);

    renderPicker();
    fireEvent.click(screen.getByTestId('querySandboxCpsPicker'));

    expect(screen.getByTestId('projectPickerContent')).toBeInTheDocument();
  });
});
