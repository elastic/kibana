/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { render, fireEvent, screen, within } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { triggersActionsUiMock } from '@kbn/triggers-actions-ui-plugin/public/mocks';
import EmailParamsFields from './email_params';
import { getIsExperimentalFeatureEnabled } from '../../common/get_experimental_features';
import { getFormattedEmailOptions } from './email_params';

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: jest.fn(),
}));
jest.mock('../../common/get_experimental_features');

const useKibanaMock = useKibana as jest.Mock;
const mockKibana = () => {
  useKibanaMock.mockReturnValue({
    services: {
      triggersActionsUi: triggersActionsUiMock.createStart(),
    },
  });
};

const emailTestCases = [
  {
    field: 'to',
    fieldValue: 'new1@test.com, new2@test.com , new1@test.com, ',
    expected: ['test@test.com', 'new1@test.com', 'new2@test.com'],
  },
  {
    field: 'cc',
    fieldValue: 'newcc1@test.com, newcc2@test.com , newcc1@test.com, ',
    expected: ['cc@test.com', 'newcc1@test.com', 'newcc2@test.com'],
  },
  {
    field: 'bcc',
    fieldValue: 'newbcc1@test.com, newbcc2@test.com , newbcc1@test.com, ',
    expected: ['bcc@test.com', 'newbcc1@test.com', 'newbcc2@test.com'],
  },
];

describe('EmailParamsFields renders', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockKibana();
    (getIsExperimentalFeatureEnabled as jest.Mock<any, any>).mockImplementation(() => true);
  });

  test('all params fields is rendered', async () => {
    const actionParams = {
      cc: [],
      bcc: [],
      to: ['test@test.com'],
      subject: 'test',
      message: 'test message',
    };

    render(
      <IntlProvider locale="en">
        <EmailParamsFields
          actionParams={actionParams}
          errors={{ to: [], cc: [], bcc: [], subject: [], message: [] }}
          editAction={() => {}}
          defaultMessage={'Some default message'}
          index={0}
        />
      </IntlProvider>
    );

    expect(screen.getByTestId('toEmailAddressInput')).toBeVisible();
    expect(screen.getByTestId('toEmailAddressInput').textContent).toStrictEqual('test@test.com');
    expect(screen.getByTestId('subjectInput')).toBeVisible();
    expect(await screen.findByTestId('messageTextArea')).toBeVisible();
  });

  emailTestCases.forEach(({ field, fieldValue, expected }) => {
    test(`"${field}" field value updates correctly when comma-separated emails are pasted`, async () => {
      const actionParams = {
        cc: ['cc@test.com'],
        bcc: ['bcc@test.com'],
        to: ['test@test.com'],
        subject: 'test',
        message: 'test message',
      };

      const editAction = jest.fn();

      render(
        <IntlProvider locale="en">
          <EmailParamsFields
            actionParams={actionParams}
            errors={{ to: [], cc: [], bcc: [], subject: [], message: [] }}
            editAction={editAction}
            defaultMessage={'Some default message'}
            index={0}
          />
        </IntlProvider>
      );

      const euiComboBox = screen.getByTestId(`${field}EmailAddressInput`);
      const input = within(euiComboBox).getByTestId('comboBoxSearchInput');
      fireEvent.change(input, { target: { value: fieldValue } });
      expect(input).toHaveValue(fieldValue);

      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
      expect(editAction).toHaveBeenCalledWith(field, expected, 0);
    });
  });

  test('message param field is rendered with default value if not set', () => {
    const actionParams = {
      cc: [],
      bcc: [],
      to: ['test@test.com'],
      subject: 'test',
    };

    const editAction = jest.fn();
    mountWithIntl(
      <EmailParamsFields
        actionParams={actionParams}
        errors={{ to: [], cc: [], bcc: [], subject: [], message: [] }}
        editAction={editAction}
        defaultMessage={'Some default message'}
        index={0}
      />
    );

    expect(editAction).toHaveBeenCalledWith('message', 'Some default message', 0);
  });

  test('when the default message changes, so is the underlying message if it was set by the previous default', () => {
    const actionParams = {
      cc: [],
      bcc: [],
      to: ['test@test.com'],
      subject: 'test',
    };

    const editAction = jest.fn();
    const wrapper = mountWithIntl(
      <EmailParamsFields
        actionParams={actionParams}
        errors={{ to: [], cc: [], bcc: [], subject: [], message: [] }}
        editAction={editAction}
        defaultMessage={'Some default message'}
        index={0}
      />
    );

    expect(editAction).toHaveBeenCalledWith('message', 'Some default message', 0);

    wrapper.setProps({
      defaultMessage: 'Some different default message',
    });

    expect(editAction).toHaveBeenCalledWith('message', 'Some different default message', 0);
  });

  test('when the default message changes, it doesnt change the underlying message if it wasnt set by a previous default', () => {
    const actionParams = {
      cc: [],
      bcc: [],
      to: ['test@test.com'],
      subject: 'test',
    };

    const editAction = jest.fn();
    const { rerender } = render(
      <IntlProvider locale="en">
        <EmailParamsFields
          actionParams={actionParams}
          errors={{ to: [], cc: [], bcc: [], subject: [], message: [] }}
          editAction={editAction}
          defaultMessage={'Some default message'}
          index={0}
        />
      </IntlProvider>
    );

    expect(editAction).toHaveBeenCalledWith('message', 'Some default message', 0);

    // simulate value being updated
    const valueToSimulate = 'some new value';
    fireEvent.change(screen.getByTestId('messageTextArea'), {
      target: { value: valueToSimulate },
    });

    expect(editAction).toHaveBeenCalledWith('message', valueToSimulate, 0);

    rerender(
      <IntlProvider locale="en">
        <EmailParamsFields
          actionParams={{
            ...actionParams,
            message: valueToSimulate,
          }}
          errors={{ to: [], cc: [], bcc: [], subject: [], message: [] }}
          editAction={editAction}
          defaultMessage={'Some default message'}
          index={0}
        />
      </IntlProvider>
    );

    rerender(
      <IntlProvider locale="en">
        <EmailParamsFields
          actionParams={{
            ...actionParams,
            message: valueToSimulate,
          }}
          errors={{ to: [], cc: [], bcc: [], subject: [], message: [] }}
          editAction={editAction}
          defaultMessage={'Some different default message'}
          index={0}
        />
      </IntlProvider>
    );

    expect(editAction).not.toHaveBeenCalledWith('message', 'Some different default message', 0);
  });

  test('when useDefaultMessage is set to true and the default message changes, the underlying message is replaced with the default message', () => {
    const actionParams = {
      cc: [],
      bcc: [],
      to: ['test@test.com'],
      subject: 'test',
    };

    const editAction = jest.fn();
    const wrapper = mountWithIntl(
      <EmailParamsFields
        actionParams={{ ...actionParams, message: 'not the default message' }}
        errors={{ to: [], cc: [], bcc: [], subject: [], message: [] }}
        editAction={editAction}
        defaultMessage={'Some default message'}
        index={0}
      />
    );
    const text = wrapper.find('[data-test-subj="messageTextArea"]').first().text();
    expect(text).toEqual('not the default message');

    wrapper.setProps({
      useDefaultMessage: true,
      defaultMessage: 'Some different default message',
    });

    expect(editAction).toHaveBeenCalledWith('message', 'Some different default message', 0);
  });

  test('when useDefaultMessage is set to false and the default message changes, the underlying message is not changed', () => {
    const actionParams = {
      cc: [],
      bcc: [],
      to: ['test@test.com'],
      subject: 'test',
    };

    const editAction = jest.fn();
    const wrapper = mountWithIntl(
      <EmailParamsFields
        actionParams={{ ...actionParams, message: 'not the default message' }}
        errors={{ to: [], cc: [], bcc: [], subject: [], message: [] }}
        editAction={editAction}
        defaultMessage={'Some default message'}
        index={0}
      />
    );
    const text = wrapper.find('[data-test-subj="messageTextArea"]').first().text();
    expect(text).toEqual('not the default message');

    wrapper.setProps({
      useDefaultMessage: false,
      defaultMessage: 'Some different default message',
    });

    expect(editAction).not.toHaveBeenCalled();
  });
});

describe('getFormattedEmailOptions', () => {
  test('should return new options added to previous options', () => {
    const searchValue = 'test@test.com, other@test.com';
    const previousOptions = [{ label: 'existing@test.com' }];
    const newOptions = getFormattedEmailOptions(searchValue, previousOptions);

    expect(newOptions).toEqual([
      { label: 'existing@test.com' },
      { label: 'test@test.com' },
      { label: 'other@test.com' },
    ]);
  });

  test('should trim extra spaces in search value', () => {
    const searchValue = ' test@test.com ,  other@test.com   ,   ';
    const previousOptions: Array<{ label: string }> = [];
    const newOptions = getFormattedEmailOptions(searchValue, previousOptions);

    expect(newOptions).toEqual([{ label: 'test@test.com' }, { label: 'other@test.com' }]);
  });

  test('should prevent duplicate email addresses', () => {
    const searchValue = 'duplicate@test.com, duplicate@test.com';
    const previousOptions = [{ label: 'existing@test.com' }, { label: 'duplicate@test.com' }];
    const newOptions = getFormattedEmailOptions(searchValue, previousOptions);

    expect(newOptions).toEqual([{ label: 'existing@test.com' }, { label: 'duplicate@test.com' }]);
  });

  test('should return previous options if search value is empty', () => {
    const searchValue = '';
    const previousOptions = [{ label: 'existing@test.com' }];
    const newOptions = getFormattedEmailOptions(searchValue, previousOptions);
    expect(newOptions).toEqual([{ label: 'existing@test.com' }]);
  });

  test('should handle single email without comma', () => {
    const searchValue = 'single@test.com';
    const previousOptions = [{ label: 'existing@test.com' }];
    const newOptions = getFormattedEmailOptions(searchValue, previousOptions);

    expect(newOptions).toEqual([{ label: 'existing@test.com' }, { label: 'single@test.com' }]);
  });
});
