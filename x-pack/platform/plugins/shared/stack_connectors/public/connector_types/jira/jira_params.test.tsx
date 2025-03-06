/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import JiraParamsFields from './jira_params';
import { useGetIssueTypes } from './use_get_issue_types';
import { useGetFieldsByIssueType } from './use_get_fields_by_issue_type';
import { useGetIssues } from './use_get_issues';
import { useGetSingleIssue } from './use_get_single_issue';
import { ActionConnector } from '@kbn/triggers-actions-ui-plugin/public/types';
import { fireEvent, render, waitFor, within, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

jest.mock('@kbn/triggers-actions-ui-plugin/public/common/lib/kibana');
jest.mock('./use_get_issue_types');
jest.mock('./use_get_fields_by_issue_type');
jest.mock('./use_get_issues');
jest.mock('./use_get_single_issue');

const useGetIssueTypesMock = useGetIssueTypes as jest.Mock;
const useGetFieldsByIssueTypeMock = useGetFieldsByIssueType as jest.Mock;
const useGetIssuesMock = useGetIssues as jest.Mock;
const useGetSingleIssueMock = useGetSingleIssue as jest.Mock;

const actionParams = {
  subAction: 'pushToService',
  subActionParams: {
    incident: {
      summary: 'sn title',
      description: 'some description',
      issueType: '10006',
      labels: ['kibana'],
      priority: 'High',
      externalId: null,
      parent: null,
      otherFields: null,
    },
    comments: [],
  },
};

const connector: ActionConnector = {
  secrets: {},
  config: {},
  id: 'test',
  actionTypeId: '.test',
  name: 'Test',
  isPreconfigured: false,
  isDeprecated: false,
  isSystemAction: false as const,
};
const editAction = jest.fn();
const defaultProps = {
  actionConnector: connector,
  actionParams,
  editAction,
  errors: { 'subActionParams.incident.summary': [] },
  index: 0,
  messageVariables: [],
};

describe('JiraParamsFields renders', () => {
  const useGetIssueTypesResponse = {
    isLoading: false,
    issueTypes: [
      {
        id: '10005',
        name: 'Task',
      },
      {
        id: '10006',
        name: 'Bug',
      },
    ],
  };

  const useGetFieldsByIssueTypeResponse = {
    isLoading: false,
    fields: {
      summary: { allowedValues: [], defaultValue: {} },
      labels: { allowedValues: [], defaultValue: {} },
      description: { allowedValues: [], defaultValue: {} },
      priority: {
        allowedValues: [
          {
            name: 'Medium',
            id: '3',
          },
          {
            name: 'High',
            id: '1',
          },
        ],
        defaultValue: { name: 'Medium', id: '3' },
      },
    },
  };

  const useGetFieldsByIssueTypeResponseNoPriority = {
    ...useGetFieldsByIssueTypeResponse,
    fields: {
      summary: { allowedValues: [], defaultValue: {} },
      labels: { allowedValues: [], defaultValue: {} },
      description: { allowedValues: [], defaultValue: {} },
    },
  };

  const useGetFieldsByIssueTypeResponseLoading = {
    isLoading: true,
    fields: {},
  };

  const useGetIssuesResponse = {
    isLoading: false,
    issues: [{ id: '1', key: '1', title: 'parent issue' }],
  };

  const useGetSingleIssueResponse = {
    issue: { id: '1', key: '1', title: 'parent issue' },
    isLoading: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useGetIssueTypesMock.mockReturnValue(useGetIssueTypesResponse);
    useGetFieldsByIssueTypeMock.mockReturnValue(useGetFieldsByIssueTypeResponse);
    useGetIssuesMock.mockReturnValue(useGetIssuesResponse);
    useGetSingleIssueMock.mockReturnValue(useGetSingleIssueResponse);
  });

  it('all params fields are rendered', async () => {
    render(<JiraParamsFields {...defaultProps} />);

    expect(screen.getByTestId('issueTypeSelect')).toBeInTheDocument();
    expect((screen.getByRole('option', { name: 'Bug' }) as HTMLOptionElement).selected).toBe(true);

    expect(screen.getByTestId('prioritySelect')).toBeInTheDocument();

    await waitFor(() => {
      expect((screen.getByRole('option', { name: 'High' }) as HTMLOptionElement).selected).toBe(
        true
      );
    });

    expect(screen.getByTestId('summaryInput')).toBeInTheDocument();
    expect(screen.getByTestId('descriptionTextArea')).toBeInTheDocument();
    expect(screen.getByTestId('labelsComboBox')).toBeInTheDocument();
    expect(screen.getByTestId('commentsTextArea')).toBeInTheDocument();
    expect(screen.getByTestId('otherFieldsJsonEditor')).toBeInTheDocument();
  });

  it('it shows loading when loading issue types', () => {
    useGetIssueTypesMock.mockReturnValue({ ...useGetIssueTypesResponse, isLoading: true });
    render(<JiraParamsFields {...defaultProps} />);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('it shows loading when loading fields', () => {
    useGetFieldsByIssueTypeMock.mockReturnValue({
      ...useGetFieldsByIssueTypeResponse,
      isLoading: true,
    });

    render(<JiraParamsFields {...defaultProps} />);

    const prioritySelect = within(screen.getByTestId('priority-wrapper'));
    const labelsComboBox = within(screen.getByTestId('labels-wrapper'));

    expect(prioritySelect.getByRole('progressbar')).toBeInTheDocument();
    expect(labelsComboBox.getByRole('progressbar')).toBeInTheDocument();
  });

  it('it disabled the fields when loading issue types', async () => {
    useGetIssueTypesMock.mockReturnValue({ ...useGetIssueTypesResponse, isLoading: true });

    render(<JiraParamsFields {...defaultProps} />);
    const labels = within(screen.getByTestId('labelsComboBox'));

    expect(screen.getByTestId('issueTypeSelect')).toBeDisabled();
    expect(screen.getByTestId('prioritySelect')).toBeDisabled();
    expect(labels.getByTestId('comboBoxSearchInput')).toBeDisabled();
  });

  it('it disabled the fields when loading fields', () => {
    useGetFieldsByIssueTypeMock.mockReturnValue({
      ...useGetFieldsByIssueTypeResponse,
      isLoading: true,
    });

    render(<JiraParamsFields {...defaultProps} />);
    const labels = within(screen.getByTestId('labelsComboBox'));

    expect(screen.getByTestId('issueTypeSelect')).toBeDisabled();
    expect(screen.getByTestId('prioritySelect')).toBeDisabled();
    expect(labels.getByTestId('comboBoxSearchInput')).toBeDisabled();
  });

  it('hide unsupported fields', () => {
    useGetIssueTypesMock.mockReturnValue(useGetIssueTypesResponse);
    useGetFieldsByIssueTypeMock.mockReturnValue({
      ...useGetFieldsByIssueTypeResponse,
      fields: {},
    });
    render(<JiraParamsFields {...defaultProps} />);

    expect(screen.getByTestId('issueTypeSelect')).toBeInTheDocument();
    expect(screen.getByTestId('summaryInput')).toBeInTheDocument();
    expect(screen.getByTestId('commentsTextArea')).toBeInTheDocument();

    expect(screen.queryByTestId('prioritySelect')).toBeFalsy();
    expect(screen.queryByTestId('descriptionTextArea')).toBeFalsy();
    expect(screen.queryByTestId('labelsComboBox')).toBeFalsy();
    expect(screen.queryByTestId('search-parent-issues')).toBeFalsy();
  });

  it('If issue type is undefined, set to first item in issueTypes', () => {
    const newProps = {
      ...defaultProps,
      actionParams: {
        ...actionParams,
        subActionParams: {
          ...actionParams.subActionParams,
          incident: {
            ...actionParams.subActionParams.incident,
            issueType: null,
          },
        },
      },
    };
    render(<JiraParamsFields {...newProps} />);
    expect(editAction.mock.calls[0][1].incident.issueType).toEqual(
      useGetIssueTypesResponse.issueTypes[0].id
    );
  });

  it('If issue type is not an option in issueTypes, set to first item in issueTypes', () => {
    const newProps = {
      ...defaultProps,
      actionParams: {
        ...actionParams,
        subActionParams: {
          ...actionParams.subActionParams,
          incident: {
            ...actionParams.subActionParams.incident,
            issueType: '999',
          },
        },
      },
    };
    render(<JiraParamsFields {...newProps} />);
    expect(editAction.mock.calls[0][1].incident.issueType).toEqual(
      useGetIssueTypesResponse.issueTypes[0].id
    );
  });

  it('When issueType and fields are null, return empty priority', () => {
    useGetFieldsByIssueTypeMock.mockReturnValue({
      ...useGetFieldsByIssueTypeResponse,
      fields: null,
    });
    const newProps = {
      ...defaultProps,
      actionParams: {
        ...actionParams,
        subActionParams: {
          ...actionParams.subActionParams,
          incident: {
            ...actionParams.subActionParams.incident,
            issueType: null,
          },
        },
      },
    };

    render(<JiraParamsFields {...newProps} />);
    expect(screen.queryByTestId('prioritySelect')).toBeFalsy();
  });

  it('If summary has errors, form row is invalid', () => {
    const newProps = {
      ...defaultProps,
      errors: { 'subActionParams.incident.summary': ['error'] },
    };

    render(<JiraParamsFields {...newProps} />);
    const summary = within(screen.getByTestId('summary-row'));

    expect(summary.getByText('error')).toBeInTheDocument();
  });

  it('When subActionParams is undefined, set to default', () => {
    useGetIssueTypesMock.mockReturnValue({ ...useGetIssueTypesResponse, issueTypes: [] });
    const { subActionParams, ...newParams } = actionParams;

    const newProps = {
      ...defaultProps,
      actionParams: newParams,
    };

    render(<JiraParamsFields {...newProps} />);
    expect(editAction.mock.calls[0][1]).toEqual({
      incident: {},
      comments: [],
    });
  });

  it('When subAction is undefined, set to default', () => {
    useGetIssueTypesMock.mockReturnValue({ ...useGetIssueTypesResponse, issueTypes: [] });
    const { subAction, ...newParams } = actionParams;

    const newProps = {
      ...defaultProps,
      actionParams: newParams,
    };

    render(<JiraParamsFields {...newProps} />);
    expect(editAction.mock.calls[0][1]).toEqual('pushToService');
  });

  it('Resets fields when connector changes', () => {
    const results = render(<JiraParamsFields {...defaultProps} />);

    results.rerender(
      <JiraParamsFields {...defaultProps} actionConnector={{ ...connector, id: '1234' }} />
    );

    expect(editAction.mock.calls.length).toEqual(1);
    expect(editAction.mock.calls[0][1]).toEqual({
      incident: {},
      comments: [],
    });
  });

  describe('UI updates', () => {
    it('updates summary', () => {
      render(<JiraParamsFields {...defaultProps} />);

      fireEvent.change(screen.getByTestId('summaryInput'), { target: { value: 'new title' } });
      expect(editAction.mock.calls[0][1].incident.summary).toEqual('new title');
    });

    it('updates description', () => {
      render(<JiraParamsFields {...defaultProps} />);

      fireEvent.change(screen.getByTestId('descriptionTextArea'), {
        target: { value: 'new desc' },
      });

      expect(editAction.mock.calls[0][1].incident.description).toEqual('new desc');
    });

    it('updates issue type', async () => {
      render(<JiraParamsFields {...defaultProps} />);

      expect(screen.getByTestId('issueTypeSelect')).toBeInTheDocument();
      expect((screen.getByRole('option', { name: 'Bug' }) as HTMLOptionElement).selected).toBe(
        true
      );

      await userEvent.selectOptions(
        screen.getByTestId('issueTypeSelect'),
        screen.getByRole('option', { name: 'Task' })
      );

      expect(editAction.mock.calls[0][1].incident.issueType).toEqual('10005');
    });

    it('updates priority', async () => {
      render(<JiraParamsFields {...defaultProps} />);

      expect(screen.getByTestId('prioritySelect')).toBeInTheDocument();

      await waitFor(() => {
        expect((screen.getByRole('option', { name: 'High' }) as HTMLOptionElement).selected).toBe(
          true
        );
      });

      await userEvent.selectOptions(
        screen.getByTestId('prioritySelect'),
        screen.getByRole('option', { name: 'Medium' })
      );

      expect(editAction.mock.calls[0][1].incident.priority).toEqual('Medium');
    });

    it('updates parent', async () => {
      useGetFieldsByIssueTypeMock.mockReturnValue({
        ...useGetFieldsByIssueTypeResponse,
        fields: {
          ...useGetFieldsByIssueTypeResponse.fields,
          parent: {},
        },
      });

      render(<JiraParamsFields {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('search-parent-issues')).toBeInTheDocument();
      });

      const parentField = within(screen.getByTestId('search-parent-issues'));

      await userEvent.type(parentField.getByTestId('comboBoxSearchInput'), 'p{enter}', {
        delay: 1,
      });

      await waitFor(async () => {
        expect(screen.getByText('parent issue')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(editAction.mock.calls[0][1].incident.parent).toEqual('1');
      });
    });

    it('updates labels correctly', async () => {
      render(<JiraParamsFields {...defaultProps} />);
      const labels = within(screen.getByTestId('labelsComboBox'));

      await userEvent.type(labels.getByTestId('comboBoxSearchInput'), 'l{enter}', {
        delay: 1,
      });

      await waitFor(() => {
        expect(editAction.mock.calls[0][1].incident.labels).toEqual(['kibana', 'l']);
      });
    });

    it('Label undefined update triggers editAction', async () => {
      const newProps = {
        ...defaultProps,
        actionParams: {
          ...actionParams,
          subActionParams: {
            ...actionParams.subActionParams,
            incident: {
              ...actionParams.subActionParams.incident,
              labels: null,
            },
          },
        },
      };
      render(<JiraParamsFields {...newProps} />);
      const labels = within(screen.getByTestId('labelsComboBox'));

      fireEvent.focusOut(labels.getByTestId('comboBoxSearchInput'));

      await waitFor(() => {
        expect(editAction.mock.calls[0][1].incident.labels).toEqual([]);
      });
    });

    it('updates a comment ', () => {
      render(<JiraParamsFields {...defaultProps} />);
      const comments = screen.getByTestId('commentsTextArea');

      fireEvent.change(comments, {
        target: { value: 'new comment' },
      });

      expect(editAction.mock.calls[0][1].comments).toEqual([
        { comment: 'new comment', commentId: '1' },
      ]);
    });

    it('updates additional fields', () => {
      const TEST_VALUE = '{"field_id":"bar"}';
      render(<JiraParamsFields {...defaultProps} />);
      const otherFields = screen.getByTestId('otherFieldsJsonEditor');

      fireEvent.change(otherFields, {
        target: { value: TEST_VALUE },
      });

      expect(editAction.mock.calls[0][1].incident.otherFields).toEqual(TEST_VALUE);
    });

    it('updating additional fields with an empty string sets its value to null', async () => {
      render(<JiraParamsFields {...defaultProps} />);
      const otherFields = await screen.findByTestId('otherFieldsJsonEditor');

      await userEvent.click(otherFields);
      await userEvent.paste('foobar');
      await userEvent.clear(otherFields);

      expect(editAction.mock.calls[1][1].incident.otherFields).toEqual(null);
    });

    it('Clears any left behind priority when issueType changes and hasPriority becomes false', async () => {
      useGetFieldsByIssueTypeMock
        .mockReturnValueOnce(useGetFieldsByIssueTypeResponse)
        .mockReturnValue(useGetFieldsByIssueTypeResponseNoPriority);

      const rerenderProps = {
        ...{
          ...defaultProps,
          actionParams: {
            ...defaultProps.actionParams,
            incident: { issueType: '10001' },
          },
        },
      };

      const results = render(<JiraParamsFields {...defaultProps} />);

      expect(screen.getByTestId('prioritySelect')).toBeInTheDocument();

      await waitFor(() => {
        expect((screen.getByRole('option', { name: 'High' }) as HTMLOptionElement).selected).toBe(
          true
        );
      });

      results.rerender(<JiraParamsFields {...rerenderProps} />);

      await waitFor(() => {
        expect(screen.queryByTestId('priority-wrapper')).toBeFalsy();
      });
      expect(editAction.mock.calls[0][1].incident.priority).toEqual(null);
    });

    it('Preserve priority when the issue type fields are loading and hasPriority becomes stale', async () => {
      useGetFieldsByIssueTypeMock
        .mockReturnValueOnce(useGetFieldsByIssueTypeResponseLoading)
        .mockReturnValue(useGetFieldsByIssueTypeResponse);

      const results = render(<JiraParamsFields {...defaultProps} />);

      expect(editAction).not.toBeCalled();

      results.rerender(<JiraParamsFields {...defaultProps} />);

      await waitFor(() => {
        expect((screen.getByRole('option', { name: 'High' }) as HTMLOptionElement).selected).toBe(
          true
        );
      });
    });

    it('renders additional info for the additional fields field', () => {
      render(<JiraParamsFields {...defaultProps} />);
      const additionalFields = screen.getByText('Additional fields help');

      expect(additionalFields).toBeInTheDocument();
    });
  });
});
