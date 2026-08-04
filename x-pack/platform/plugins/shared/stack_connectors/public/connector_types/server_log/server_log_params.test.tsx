/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { I18nProvider } from '@kbn/i18n-react';
import { ServerLogLevelOptions } from '../types';
import ServerLogParamsFields from './server_log_params';

describe('ServerLogParamsFields renders', () => {
  test('all params fields is rendered', () => {
    const editAction = jest.fn();
    const actionParams = {
      level: ServerLogLevelOptions.TRACE,
      message: 'test',
    };
    renderWithI18n(
      <ServerLogParamsFields
        actionParams={actionParams}
        errors={{ message: [] }}
        editAction={editAction}
        index={0}
        defaultMessage={'test default message'}
      />
    );
    expect(editAction).not.toHaveBeenCalled();
    expect(screen.getByTestId('loggingLevelSelect')).toBeInTheDocument();
    expect(screen.getByTestId('loggingLevelSelect')).toHaveValue('trace');
    expect(screen.getByTestId('messageTextArea')).toBeInTheDocument();
  });

  test('level param field is rendered with default value if not selected', () => {
    const actionParams = {
      message: 'test message',
    };
    const editAction = jest.fn();

    renderWithI18n(
      <ServerLogParamsFields
        actionParams={actionParams}
        errors={{ message: [] }}
        editAction={editAction}
        index={0}
      />
    );

    expect(editAction).toHaveBeenCalledWith('level', 'info', 0);
  });

  test('when useDefaultMessage is set to false and the default message changes, the underlying message is not changed', () => {
    const actionParams = {
      level: ServerLogLevelOptions.TRACE,
    };

    const editAction = jest.fn();
    const { rerender } = renderWithI18n(
      <ServerLogParamsFields
        actionParams={{ ...actionParams, message: 'not the default message' }}
        errors={{ message: [] }}
        editAction={editAction}
        defaultMessage={'Some default message'}
        index={0}
      />
    );
    expect(screen.getByTestId('messageTextArea')).toHaveValue('not the default message');

    rerender(
      <I18nProvider>
        <ServerLogParamsFields
          actionParams={{ ...actionParams, message: 'not the default message' }}
          errors={{ message: [] }}
          editAction={editAction}
          defaultMessage={'Some different default message'}
          useDefaultMessage={false}
          index={0}
        />
      </I18nProvider>
    );

    expect(editAction).not.toHaveBeenCalled();
  });
});
