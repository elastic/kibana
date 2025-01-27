/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import TeamsParamsFields from './teams_params';
jest.mock('@kbn/triggers-actions-ui-plugin/public/common/lib/kibana');

describe('TeamsParamsFields renders', () => {
  test('all params fields is rendered', () => {
    const actionParams = {
      message: 'test message',
    };

    const wrapper = mountWithIntl(
      <TeamsParamsFields
        actionParams={actionParams}
        errors={{ message: [] }}
        editAction={() => {}}
        index={0}
      />
    );
    expect(wrapper.find('[data-test-subj="messageTextArea"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="messageTextArea"]').first().prop('value')).toStrictEqual(
      'test message'
    );
  });

  test('when useDefaultMessage is set to true and the default message changes, the underlying message is replaced with the default message', () => {
    const actionParams = {
      message: 'not the default message',
    };

    const editAction = jest.fn();
    const wrapper = mountWithIntl(
      <TeamsParamsFields
        actionParams={actionParams}
        errors={{ message: [] }}
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
      message: 'not the default message',
    };

    const editAction = jest.fn();
    const wrapper = mountWithIntl(
      <TeamsParamsFields
        actionParams={actionParams}
        errors={{ message: [] }}
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
