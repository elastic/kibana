/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ResilientParamsFields from './resilient_params';
import { useGetIncidentTypes } from './use_get_incident_types';
import { useGetSeverity } from './use_get_severity';

jest.mock('./use_get_incident_types');
jest.mock('./use_get_severity');
jest.mock('@kbn/triggers-actions-ui-plugin/public/common/lib/kibana', () => ({
  useKibana: () => ({
    services: { http: {}, notifications: { toasts: { addDanger: jest.fn() } } },
  }),
}));

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
    },
    comments: [],
  },
};
const connector = {
  secrets: {},
  config: {},
  id: 'test',
  actionTypeId: '.test',
  name: 'Test',
  isPreconfigured: false,
  isSystemAction: false as const,
  isDeprecated: false,
};

const editAction = jest.fn();
const defaultProps = {
  actionParams,
  errors: { 'subActionParams.incident.name': [] },
  editAction,
  index: 0,
  messageVariables: [],
  actionConnector: connector,
};

describe('ResilientParamsFields', () => {
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

  test('renders all param fields', async () => {
    render(<ResilientParamsFields {...defaultProps} />);
    expect(await screen.findByTestId('incidentTypeComboBox')).toBeInTheDocument();
    const severity = screen.getByTestId('severitySelect') as HTMLSelectElement;
    expect(severity.value).toBe('6');
    expect(screen.getByTestId('nameInput')).toBeInTheDocument();
    expect(screen.getByTestId('descriptionTextArea')).toBeInTheDocument();
    expect(screen.getByTestId('commentsTextArea')).toBeInTheDocument();
  });
  test('shows loading when loading incident types', () => {
    useGetIncidentTypesMock.mockReturnValue({ ...useGetIncidentTypesResponse, isLoading: true });
    render(<ResilientParamsFields {...defaultProps} />);
    const combo = screen.getByTestId('incidentTypeComboBox');
    // cannot directly read isLoading prop; assert disabled state via nested input
    expect(combo.querySelector('input')).toBeDisabled();
  });

  test('shows loading when loading severity', () => {
    useGetSeverityMock.mockReturnValue({ ...useGetSeverityResponse, isLoading: true });
    render(<ResilientParamsFields {...defaultProps} />);
    const severity = screen.getByTestId('severitySelect');
    // EuiSelect exposes disabled attr when loading
    expect(severity).toBeDisabled();
  });

  test('disables incident type while loading', () => {
    useGetIncidentTypesMock.mockReturnValue({ ...useGetIncidentTypesResponse, isLoading: true });
    render(<ResilientParamsFields {...defaultProps} />);
    const combo = screen.getByTestId('incidentTypeComboBox');
    expect(combo.querySelector('input')).toBeDisabled();
  });

  test('disables severity while loading', () => {
    useGetSeverityMock.mockReturnValue({ ...useGetSeverityResponse, isLoading: true });
    render(<ResilientParamsFields {...defaultProps} />);
    const severity = screen.getByTestId('severitySelect');
    expect(severity).toBeDisabled();
  });
  test('marks name invalid when errors present', () => {
    render(
      <ResilientParamsFields
        {...defaultProps}
        errors={{ 'subActionParams.incident.name': ['error'] }}
      />
    );
    const nameInput = screen.getByTestId('nameInput');
    expect(nameInput).toHaveAttribute('aria-invalid', 'true');
  });
  test('initializes default subActionParams when missing', () => {
    const { subActionParams, ...rest } = actionParams;
    render(<ResilientParamsFields {...defaultProps} actionParams={{ ...rest }} />);
    expect(editAction.mock.calls[0][1]).toEqual({ incident: {}, comments: [] });
  });
  test('initializes default subAction when missing', () => {
    const { subAction, ...rest } = actionParams;
    render(<ResilientParamsFields {...defaultProps} actionParams={{ ...rest }} />);
    expect(editAction.mock.calls[0][1]).toEqual('pushToService');
  });
  test('resets on connector change', () => {
    const { rerender } = render(<ResilientParamsFields {...defaultProps} />);
    expect(editAction).not.toHaveBeenCalled();
    rerender(
      <ResilientParamsFields {...defaultProps} actionConnector={{ ...connector, id: '1234' }} />
    );
    expect(editAction).toHaveBeenCalledTimes(1);
    expect(editAction.mock.calls[0][1]).toEqual({ incident: {}, comments: [] });
  });
  describe('field updates', () => {
    const cases: Array<{ testId: string; key: string; value: string }> = [
      { testId: 'nameInput', key: 'name', value: 'Bug' },
      { testId: 'descriptionTextArea', key: 'description', value: 'New description' },
    ];

    test.each(cases)('updates %s', async ({ testId, key, value }) => {
      editAction.mockClear();
      render(<ResilientParamsFields {...defaultProps} />);
      const input = await screen.findByTestId(testId);
      fireEvent.change(input, { target: { value } });
      const update = [...editAction.mock.calls].reverse().find((c) => c[0] === 'subActionParams');
      expect(update?.[1].incident[key]).toBe(value);
    });

    test('updates severity select', () => {
      editAction.mockClear();
      render(<ResilientParamsFields {...defaultProps} />);
      const select = screen.getByTestId('severitySelect');
      fireEvent.change(select, { target: { value: '5' } });
      expect(editAction.mock.calls[0][1].incident.severityCode).toBe('5');
    });

    test('clears incident types on blur when undefined', () => {
      editAction.mockClear();
      const newParams = {
        ...actionParams,
        subActionParams: {
          ...actionParams.subActionParams,
          incident: { ...actionParams.subActionParams.incident, incidentTypes: null },
          comments: [],
        },
      };
      render(<ResilientParamsFields {...defaultProps} actionParams={newParams} />);
      const combo = screen.getByTestId('incidentTypeComboBox');
      fireEvent.blur(combo);
      expect(editAction.mock.calls[0][1].incident.incidentTypes).toEqual([]);
    });

    test('adds a comment', () => {
      editAction.mockClear();
      render(<ResilientParamsFields {...defaultProps} />);
      const comments = screen.getByTestId('commentsTextArea');
      fireEvent.change(comments, { target: { value: 'A comment' } });
      expect(editAction.mock.calls[0][1].comments).toHaveLength(1);
    });
  });
});
