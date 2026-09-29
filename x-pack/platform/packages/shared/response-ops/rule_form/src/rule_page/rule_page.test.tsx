/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { RulePage } from './rule_page';
import {
  RULE_FORM_PAGE_RULE_DEFINITION_TITLE,
  RULE_FORM_PAGE_RULE_ACTIONS_TITLE,
  RULE_FORM_PAGE_RULE_DETAILS_TITLE,
} from '../translations';
import type { RuleFormData } from '../types';

vi.mock('../rule_definition', () => {
  const mocked = {
    RuleDefinition: () => <div />,
  };
  return { ...mocked, default: mocked };
});

vi.mock('../rule_actions', () => {
  const mocked = {
    RuleActions: () => <div />,
  };
  return { ...mocked, default: mocked };
});

vi.mock('../rule_details', () => {
  const mocked = {
    RuleDetails: () => <div />,
  };
  return { ...mocked, default: mocked };
});

vi.mock('../hooks/use_rule_form_state', () => {
  const mocked = {
    useRuleFormState: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../hooks/use_rule_form_dispatch', () => {
  const mocked = {
    useRuleFormDispatch: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

const { useRuleFormState } = await vi.importMock('../hooks/use_rule_form_state');

const navigateToUrl = vi.fn();

const formDataMock: RuleFormData = {
  params: {
    aggType: 'count',
    termSize: 5,
    thresholdComparator: '>',
    timeWindowSize: 5,
    timeWindowUnit: 'm',
    groupBy: 'all',
    threshold: [1000],
    index: ['.kibana'],
    timeField: 'alert.executionStatus.lastExecutionDate',
  },
  actions: [],
  consumer: 'stackAlerts',
  schedule: { interval: '1m' },
  tags: [],
  name: 'test',
  notifyWhen: 'onActionGroupChange',
  alertDelay: {
    active: 10,
  },
};

const onCancel = vi.fn();

useRuleFormState.mockReturnValue({
  plugins: {
    application: {
      navigateToUrl,
      capabilities: {
        actions: {
          show: true,
          save: true,
          execute: true,
        },
      },
    },
  },
  baseErrors: {},
  paramsErrors: {},
  multiConsumerSelection: 'logs',
  formData: formDataMock,
  connectors: [],
  connectorTypes: [],
  aadTemplateFields: [],
});

const onSave = vi.fn();

describe('rulePage', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  test('renders correctly', () => {
    render(<RulePage onCancel={onCancel} onSave={onSave} />);

    expect(screen.getByText(RULE_FORM_PAGE_RULE_DEFINITION_TITLE)).toBeInTheDocument();
    expect(screen.getByText(RULE_FORM_PAGE_RULE_ACTIONS_TITLE)).toBeInTheDocument();
    expect(screen.getByText(RULE_FORM_PAGE_RULE_DETAILS_TITLE)).toBeInTheDocument();
  });

  test('should call onSave when save button is pressed', () => {
    render(<RulePage onCancel={onCancel} onSave={onSave} />);

    fireEvent.click(screen.getByTestId('rulePageFooterSaveButton'));
    fireEvent.click(screen.getByTestId('confirmModalConfirmButton'));

    expect(onSave).toHaveBeenCalledWith({
      ...formDataMock,
      consumer: 'logs',
    });
  });

  test('should call onCancel when the cancel button is clicked', () => {
    render(<RulePage onCancel={onCancel} onSave={onSave} />);

    fireEvent.click(screen.getByTestId('rulePageFooterCancelButton'));
    expect(onCancel).toHaveBeenCalled();
  });

  test('should call onCancel when the return button is clicked', () => {
    render(<RulePage onCancel={onCancel} onSave={onSave} />);

    fireEvent.click(screen.getByTestId('rulePageReturnButton'));
    expect(onCancel).toHaveBeenCalled();
  });

  test('should display discard changes modal only if changes are made in the form', () => {
    useRuleFormState.mockReturnValue({
      plugins: {
        application: {
          navigateToUrl,
          capabilities: {
            actions: {
              show: true,
              save: true,
              execute: true,
            },
          },
        },
      },
      baseErrors: {},
      paramsErrors: {},
      touched: true,
      formData: formDataMock,
      connectors: [],
      connectorTypes: [],
      aadTemplateFields: [],
    });

    render(<RulePage onCancel={onCancel} onSave={onSave} />);

    fireEvent.click(screen.getByTestId('rulePageFooterCancelButton'));
    expect(screen.getByTestId('confirmRuleCloseModal')).toBeInTheDocument();
  });

  test('should not display discard changes modal id no changes are made in the form', () => {
    useRuleFormState.mockReturnValue({
      plugins: {
        application: {
          navigateToUrl,
          capabilities: {
            actions: {
              show: true,
              save: true,
              execute: true,
            },
          },
        },
      },
      baseErrors: {},
      paramsErrors: {},
      touched: false,
      formData: formDataMock,
      connectors: [],
      connectorTypes: [],
      aadTemplateFields: [],
    });

    render(<RulePage onCancel={onCancel} onSave={onSave} />);

    fireEvent.click(screen.getByTestId('rulePageFooterCancelButton'));
    expect(screen.queryByTestId('confirmRuleCloseModal')).not.toBeInTheDocument();
  });
});
