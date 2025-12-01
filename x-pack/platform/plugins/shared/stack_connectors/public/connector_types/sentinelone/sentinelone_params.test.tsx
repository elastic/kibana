/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { SUB_ACTION } from '@kbn/connector-schemas/sentinelone/constants';
import type { SentinelOneActionParams } from '@kbn/connector-schemas/sentinelone';
import SentinelOneParamsFields from './sentinelone_params';

const actionParams = {
  subAction: SUB_ACTION.GET_AGENTS,
  subActionParams: {},
} as unknown as SentinelOneActionParams;

describe('SentinelOneParamsFields renders', () => {
  test('all params fields are rendered', () => {
    const wrapper = mountWithIntl(
      <SentinelOneParamsFields
        actionParams={actionParams}
        errors={{ body: [] }}
        editAction={jest.fn()}
        index={0}
        messageVariables={[]}
      />
    );
    expect(wrapper.find('[data-test-subj="actionTypeSelect"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="actionTypeSelect"]').first().prop('readOnly')).toEqual(
      true
    );
  });
});
