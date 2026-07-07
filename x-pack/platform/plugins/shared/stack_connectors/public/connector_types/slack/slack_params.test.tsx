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
import SlackParamsFields from './slack_params';

describe('SlackParamsFields renders', () => {
  test('all params fields is rendered', () => {
    const actionParams = {
      message: 'test message',
    };

    renderWithI18n(
      <SlackParamsFields
        actionParams={actionParams}
        errors={{ message: [] }}
        editAction={() => {}}
        index={0}
      />
    );
    expect(screen.getByTestId('messageTextArea')).toBeInTheDocument();
    expect(screen.getByTestId('messageTextArea')).toHaveValue('test message');
  });

  test('when useDefaultMessage is set to true and the default message changes, the underlying message is replaced with the default message', () => {
    const actionParams = {
      message: 'not the default message',
    };

    const editAction = jest.fn();
    const { rerender } = renderWithI18n(
      <SlackParamsFields
        actionParams={actionParams}
        errors={{ message: [] }}
        editAction={editAction}
        defaultMessage={'Some default message'}
        index={0}
      />
    );
    expect(screen.getByTestId('messageTextArea')).toHaveValue('not the default message');

    rerender(
      <I18nProvider>
        <SlackParamsFields
          actionParams={actionParams}
          errors={{ message: [] }}
          editAction={editAction}
          useDefaultMessage={true}
          defaultMessage={'Some different default message'}
          index={0}
        />
      </I18nProvider>
    );

    expect(editAction).toHaveBeenCalledWith('message', 'Some different default message', 0);
  });

  test('when useDefaultMessage is set to false and the default message changes, the underlying message is not changed', () => {
    const actionParams = {
      message: 'not the default message',
    };

    const editAction = jest.fn();
    const { rerender } = renderWithI18n(
      <SlackParamsFields
        actionParams={actionParams}
        errors={{ message: [] }}
        editAction={editAction}
        defaultMessage={'Some default message'}
        index={0}
      />
    );
    expect(screen.getByTestId('messageTextArea')).toHaveValue('not the default message');

    rerender(
      <I18nProvider>
        <SlackParamsFields
          actionParams={actionParams}
          errors={{ message: [] }}
          editAction={editAction}
          useDefaultMessage={false}
          defaultMessage={'Some different default message'}
          index={0}
        />
      </I18nProvider>
    );

    expect(editAction).not.toHaveBeenCalled();
  });
});
