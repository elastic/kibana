/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render as rtlRender, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ContentManagementPublicStart } from '@kbn/content-management-plugin/public';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { RuleDetails } from './rule_details';

jest.mock('../hooks', () => ({
  useRuleFormState: jest.fn(),
  useRuleFormDispatch: jest.fn(),
}));

const { useRuleFormState, useRuleFormDispatch } = jest.requireMock('../hooks');

const render = (toRender: React.ReactElement) =>
  rtlRender(toRender, {
    wrapper: ({ children }) => <IntlProvider>{children}</IntlProvider>,
  });

const mockOnChange = jest.fn();

describe('RuleDetails', () => {
  beforeEach(() => {
    useRuleFormState.mockReturnValue({
      plugins: {
        contentManagement: {} as ContentManagementPublicStart,
      },
      formData: {
        name: 'test',
        tags: [],
      },
    });
    useRuleFormDispatch.mockReturnValue(mockOnChange);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('Renders correctly', () => {
    render(<RuleDetails />);

    expect(screen.getByTestId('ruleDetails')).toBeInTheDocument();
  });

  test('Should allow name to be changed', () => {
    render(<RuleDetails />);

    fireEvent.change(screen.getByTestId('ruleDetailsNameInput'), { target: { value: 'hello' } });
    expect(mockOnChange).toHaveBeenCalledWith({
      type: 'setName',
      payload: 'hello',
    });
  });

  test('Should allow tags to be changed', async () => {
    render(<RuleDetails />);

    await userEvent.type(
      within(screen.getByTestId('ruleDetailsTagsInput')).getByTestId('comboBoxInput'),
      'tag{enter}'
    );
    expect(mockOnChange).toHaveBeenCalledWith({
      type: 'setTags',
      payload: ['tag'],
    });
  });

  test('Should display error', () => {
    useRuleFormState.mockReturnValue({
      plugins: {
        contentManagement: {} as ContentManagementPublicStart,
      },
      formData: {
        name: 'test',
        tags: [],
      },
      baseErrors: {
        name: 'name is invalid',
        tags: 'tags is invalid',
      },
    });
    render(<RuleDetails />);

    expect(screen.getByText('name is invalid')).toBeInTheDocument();
    expect(screen.getByText('tags is invalid')).toBeInTheDocument();
  });

  test('should call dispatch with artifacts object when investigation guide is added', async () => {
    useRuleFormState.mockReturnValue({
      plugins: {
        contentManagement: {} as ContentManagementPublicStart,
      },
      formData: {
        id: 'test-id',
        params: {},
        schedule: {
          interval: '1m',
        },
        alertDelay: {
          active: 5,
        },
        notifyWhen: null,
        consumer: 'stackAlerts',
        ruleTypeId: '.es-query',
      },
      canShowConsumerSelection: true,
      validConsumers: ['logs', 'stackAlerts'],
    });
    render(<RuleDetails />);

    const investigationGuideEditor = screen.getByTestId('investigationGuideEditor');
    const investigationGuideTextArea = screen.getByLabelText(
      'Add guidelines for addressing alerts created by this rule'
    );
    expect(investigationGuideEditor).toBeInTheDocument();
    expect(investigationGuideEditor).toBeVisible();
    expect(
      screen.getByPlaceholderText('Add guidelines for addressing alerts created by this rule')
    );

    fireEvent.change(investigationGuideTextArea, {
      target: {
        value: '# Example investigation guide',
      },
    });

    expect(mockOnChange).toHaveBeenCalledWith({
      type: 'setRuleProperty',
      payload: {
        property: 'artifacts',
        value: {
          investigation_guide: {
            blob: '# Example investigation guide',
          },
        },
      },
    });
    expect(mockOnChange).toHaveBeenCalledTimes(1);
  });
});
