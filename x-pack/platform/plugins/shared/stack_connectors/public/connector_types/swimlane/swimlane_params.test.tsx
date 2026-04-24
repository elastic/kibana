/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { I18nProvider } from '@kbn/i18n-react';
import SwimlaneParamsFields from './swimlane_params';
import { SwimlaneConnectorType } from './types';
import { mappings } from './mocks';
import { createMockActionConnector } from '@kbn/alerts-ui-shared/src/common/test_utils/connector.mock';

describe('SwimlaneParamsFields renders', () => {
  const editAction = jest.fn();
  const actionParams = {
    subAction: 'pushToService',
    subActionParams: {
      incident: {
        alertId: '3456789',
        ruleName: 'rule name',
        severity: 'critical',
        caseId: null,
        caseName: null,
        description: null,
        externalId: null,
      },
      comments: [],
    },
  };

  const connector = createMockActionConnector({
    id: 'test',
    actionTypeId: '.test',
    name: 'Test',
    config: { mappings, connectorType: SwimlaneConnectorType.All },
  });

  const defaultProps = {
    actionParams,
    errors: {
      'subActionParams.incident.ruleName': [],
      'subActionParams.incident.alertId': [],
    },
    editAction,
    index: 0,
    messageVariables: [],
    actionConnector: connector,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('all params fields are rendered', () => {
    renderWithI18n(<SwimlaneParamsFields {...defaultProps} />);

    expect(screen.getByTestId('severityInput')).toBeInTheDocument();
    expect(screen.getByTestId('commentsTextArea')).toBeInTheDocument();
  });

  test('it set the correct default params', () => {
    renderWithI18n(<SwimlaneParamsFields {...defaultProps} actionParams={{}} />);
    expect(editAction).toHaveBeenCalledWith('subAction', 'pushToService', 0);
    expect(editAction).toHaveBeenCalledWith(
      'subActionParams',
      {
        incident: { alertId: '{{alert.id}}', ruleName: '{{rule.name}}' },
        comments: [],
      },
      0
    );
  });

  test('it reset the fields when connector changes', () => {
    const { rerender } = renderWithI18n(<SwimlaneParamsFields {...defaultProps} />);
    expect(editAction).not.toHaveBeenCalled();

    rerender(
      <I18nProvider>
        <SwimlaneParamsFields {...defaultProps} actionConnector={{ ...connector, id: '1234' }} />
      </I18nProvider>
    );
    expect(editAction).toHaveBeenCalledWith(
      'subActionParams',
      {
        incident: { alertId: '{{alert.id}}', ruleName: '{{rule.name}}' },
        comments: [],
      },
      0
    );
  });

  test('it set the severity', () => {
    const { rerender } = renderWithI18n(<SwimlaneParamsFields {...defaultProps} />);
    expect(editAction).not.toHaveBeenCalled();

    rerender(
      <I18nProvider>
        <SwimlaneParamsFields {...defaultProps} actionConnector={{ ...connector, id: '1234' }} />
      </I18nProvider>
    );
    expect(editAction).toHaveBeenCalledWith(
      'subActionParams',
      {
        incident: { alertId: '{{alert.id}}', ruleName: '{{rule.name}}' },
        comments: [],
      },
      0
    );
  });

  describe('UI updates', () => {
    const simpleFields = [{ dataTestSubj: 'severityInput', key: 'severity' }];

    simpleFields.forEach((field) =>
      test(`${field.key} update triggers editAction`, async () => {
        renderWithI18n(<SwimlaneParamsFields {...defaultProps} />);
        const theField = screen.getByTestId(field.dataTestSubj);
        await userEvent.tripleClick(theField);
        await userEvent.paste('Bug');
        expect(editAction.mock.calls.at(-1)[1].incident[field.key]).toEqual('Bug');
      })
    );

    test('A comment triggers editAction', async () => {
      renderWithI18n(<SwimlaneParamsFields {...defaultProps} />);
      const commentsTextArea = screen.getByTestId('commentsTextArea');
      await userEvent.type(commentsTextArea, 'Bug');
      expect(editAction.mock.calls.at(-1)[1].comments.length).toEqual(1);
    });
  });
});
