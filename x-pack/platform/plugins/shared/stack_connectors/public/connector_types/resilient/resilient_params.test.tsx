/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ResilientParamsFields from './resilient_params';
import { useGetIncidentTypes } from './use_get_incident_types';
import { useGetSeverity } from './use_get_severity';
import { createMockActionConnector } from '@kbn/alerts-ui-shared/src/common/test_utils/connector.mock';

jest.mock('./use_get_incident_types');
jest.mock('./use_get_severity');
jest.mock('@kbn/triggers-actions-ui-plugin/public/common/lib/kibana');

const useGetIncidentTypesMock = useGetIncidentTypes as jest.Mock;
const useGetSeverityMock = useGetSeverity as jest.Mock;

const actionParams = {
  subAction: 'pushToService',
  subActionParams: {
    incident: {
      name: 'title',
      description: 'some description',
      incidentTypes: [1001],
      severityCode: 6,
      externalId: null,
      additionalFields: null,
    },
    comments: [],
  },
};
const connector = createMockActionConnector({
  id: 'test',
  actionTypeId: '.test',
  name: 'Test',
});

const editAction = jest.fn();
const defaultProps = {
  actionParams,
  errors: { 'subActionParams.incident.name': [] },
  editAction,
  index: 0,
  messageVariables: [],
  actionConnector: connector,
};

describe('ResilientParamsFields renders', () => {
  const useGetIncidentTypesResponse = {
    isLoading: false,
    incidentTypes: [
      { id: 19, name: 'Malware' },
      { id: 21, name: 'Denial of Service' },
    ],
  };

  const useGetSeverityResponse = {
    isLoading: false,
    severity: [
      { id: 4, name: 'Low' },
      { id: 5, name: 'Medium' },
      { id: 6, name: 'High' },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useGetIncidentTypesMock.mockReturnValue(useGetIncidentTypesResponse);
    useGetSeverityMock.mockReturnValue(useGetSeverityResponse);
  });

  test('all params fields are rendered', () => {
    render(<ResilientParamsFields {...defaultProps} />);
    expect(screen.getByTestId('incidentTypeComboBox')).toBeInTheDocument();
    expect(screen.getByTestId('nameInput')).toBeInTheDocument();
    expect(screen.getByTestId('descriptionTextArea')).toBeInTheDocument();
    expect(screen.getByTestId('commentsTextArea')).toBeInTheDocument();
    expect(screen.getByTestId('additionalFields')).toBeInTheDocument();
  });

  test('it shows loading when loading incident types', () => {
    useGetIncidentTypesMock.mockReturnValue({ ...useGetIncidentTypesResponse, isLoading: true });
    render(<ResilientParamsFields {...defaultProps} />);
    // EUI ComboBox renders a loading spinner when isLoading is true
    expect(
      screen.getByTestId('incidentTypeComboBox').querySelector('.euiLoadingSpinner')
    ).toBeInTheDocument();
  });

  test('it shows loading when loading severity', () => {
    useGetSeverityMock.mockReturnValue({
      ...useGetSeverityResponse,
      isLoading: true,
    });
    render(<ResilientParamsFields {...defaultProps} />);
    expect(screen.getByTestId('severitySelect')).toBeDisabled();
  });

  test('it disabled the fields when loading issue types', () => {
    useGetIncidentTypesMock.mockReturnValue({ ...useGetIncidentTypesResponse, isLoading: true });
    render(<ResilientParamsFields {...defaultProps} />);
    const comboBoxInput = within(screen.getByTestId('incidentTypeComboBox')).getByRole('combobox');
    expect(comboBoxInput).toBeDisabled();
  });

  test('it disabled the fields when loading severity', () => {
    useGetSeverityMock.mockReturnValue({
      ...useGetSeverityResponse,
      isLoading: true,
    });
    render(<ResilientParamsFields {...defaultProps} />);
    expect(screen.getByTestId('severitySelect')).toBeDisabled();
  });

  test('If name has errors, form row is invalid', () => {
    const newProps = {
      ...defaultProps,
      errors: { 'subActionParams.incident.name': ['error'] },
    };
    render(<ResilientParamsFields {...newProps} />);
    expect(screen.getByTestId('nameInput')).toHaveAttribute('aria-invalid', 'true');
  });

  test('When subActionParams is undefined, set to default', () => {
    const { subActionParams, ...newParams } = actionParams;

    const newProps = {
      ...defaultProps,
      actionParams: newParams,
    };
    render(<ResilientParamsFields {...newProps} />);
    expect(editAction.mock.calls[0][1]).toEqual({
      incident: {},
      comments: [],
    });
  });

  test('When subAction is undefined, set to default', () => {
    const { subAction, ...newParams } = actionParams;

    const newProps = {
      ...defaultProps,
      actionParams: newParams,
    };
    render(<ResilientParamsFields {...newProps} />);
    expect(editAction.mock.calls[0][1]).toEqual('pushToService');
  });

  test('Resets fields when connector changes', () => {
    const { rerender } = render(<ResilientParamsFields {...defaultProps} />);
    expect(editAction.mock.calls.length).toEqual(0);
    rerender(
      <ResilientParamsFields {...defaultProps} actionConnector={{ ...connector, id: '1234' }} />
    );
    expect(editAction.mock.calls.length).toEqual(1);
    expect(editAction.mock.calls[0][1]).toEqual({
      incident: {},
      comments: [],
    });
  });

  describe('UI updates', () => {
    test('name update triggers editAction', async () => {
      render(<ResilientParamsFields {...defaultProps} />);
      await userEvent.tripleClick(screen.getByTestId('nameInput'));
      await userEvent.paste('Bug');
      expect(editAction.mock.calls.at(-1)[1].incident.name).toEqual('Bug');
    });

    test('description update triggers editAction', async () => {
      render(<ResilientParamsFields {...defaultProps} />);
      await userEvent.tripleClick(screen.getByTestId('descriptionTextArea'));
      await userEvent.paste('Bug');
      expect(editAction.mock.calls.at(-1)[1].incident.description).toEqual('Bug');
    });

    test('severityCode update triggers editAction', async () => {
      render(<ResilientParamsFields {...defaultProps} />);
      await userEvent.selectOptions(screen.getByTestId('severitySelect'), '4');
      expect(editAction.mock.calls.at(-1)[1].incident.severityCode).toEqual('4');
    });

    test('incidentTypeComboBox creation triggers editAction', async () => {
      render(<ResilientParamsFields {...defaultProps} />);
      const input = within(screen.getByTestId('incidentTypeComboBox')).getByRole('combobox');
      await userEvent.click(input);
      await userEvent.type(input, 'Malware');
      const option = await screen.findByText('Malware');
      await userEvent.click(option, { pointerEventsCheck: 0 });
      expect(editAction.mock.calls[0][1].incident.incidentTypes).toEqual(['19']);
    });

    test('incidentTypes undefined triggers editAction', async () => {
      const newProps = {
        ...defaultProps,
        actionParams: {
          ...actionParams,
          subActionParams: {
            ...actionParams.subActionParams,
            incident: {
              ...actionParams.subActionParams.incident,
              incidentTypes: null,
            },
          },
        },
      };
      render(<ResilientParamsFields {...newProps} />);
      const input = within(screen.getByTestId('incidentTypeComboBox')).getByRole('combobox');
      // Trigger blur without selection to verify empty incidentTypes
      await userEvent.click(input);
      await userEvent.tab();
      expect(editAction.mock.calls.at(-1)[1].incident.incidentTypes).toEqual([]);
    });

    test('A comment triggers editAction', async () => {
      render(<ResilientParamsFields {...defaultProps} />);
      await userEvent.type(screen.getByTestId('commentsTextArea'), 'Bug');
      expect(editAction.mock.calls.at(-1)[1].comments.length).toEqual(1);
    });
  });
});
