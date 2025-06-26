/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { SUB_ACTION } from '../../../common/crowdstrike/constants';
import type { CrowdstrikeActionParams } from '../../../common/crowdstrike/types';
import CrowdstrikeParamsFields from './crowdstrike_params';

const actionParams = {
  subAction: SUB_ACTION.GET_AGENT_DETAILS,
  subActionParams: {
    ids: ['test'],
  },
} as unknown as CrowdstrikeActionParams;

describe('CrowdstrikeParamsFields renders', () => {
  test('all params fields are rendered', () => {
    const wrapper = mountWithIntl(
      <CrowdstrikeParamsFields
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
    expect(wrapper.find('[data-test-subj="agentIdSelect"]').length > 0).toBeTruthy();
  });
});
