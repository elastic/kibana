/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiSuperSelect } from '@elastic/eui';
import type { ActionParamsProps } from '@kbn/triggers-actions-ui-plugin/public';
import { SUB_ACTION } from '../../../common/sentinelone/constants';
import type { SentinelOneActionParams } from '../../../common/sentinelone/types';
import * as i18n from './translations';

const actionTypeOptions = [
  {
    value: SUB_ACTION.GET_AGENTS,
    inputDisplay: i18n.GET_AGENT_ACTION_LABEL,
  },
];

const SentinelOneParamsFields: React.FunctionComponent<
  ActionParamsProps<SentinelOneActionParams>
> = ({ editAction, index }) => {
  const [subAction] = useState<string | undefined>(SUB_ACTION.GET_AGENTS);

  useEffect(() => {
    editAction('subActionParams', {}, index);
    editAction('subAction', subAction, index);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem>
        <EuiFormRow fullWidth label={i18n.ACTION_TYPE_LABEL}>
          <EuiSuperSelect
            fullWidth
            options={actionTypeOptions}
            valueOfSelected={subAction}
            readOnly={true}
            data-test-subj="actionTypeSelect"
          />
        </EuiFormRow>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

// eslint-disable-next-line import/no-default-export
export { SentinelOneParamsFields as default };
