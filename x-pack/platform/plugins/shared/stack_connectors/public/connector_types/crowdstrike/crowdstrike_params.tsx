/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiSuperSelect, EuiComboBox } from '@elastic/eui';
import { ActionParamsProps } from '@kbn/triggers-actions-ui-plugin/public';
import { SUB_ACTION } from '../../../common/crowdstrike/constants';
import type { CrowdstrikeActionParams } from '../../../common/crowdstrike/types';
import * as i18n from './translations';

const actionTypeOptions = [
  {
    value: SUB_ACTION.GET_AGENT_DETAILS,
    inputDisplay: i18n.GET_AGENT_DETAILS_ACTION_LABEL,
  },
];

const CrowdstrikeParamsFields: React.FunctionComponent<
  ActionParamsProps<CrowdstrikeActionParams>
> = ({ actionParams, editAction, index, errors }) => {
  const [subActionValue] = useState<string | undefined>(SUB_ACTION.GET_AGENT_DETAILS);

  const { ids } = useMemo(
    () =>
      actionParams.subActionParams ??
      ({
        ids: [],
      } as unknown as CrowdstrikeActionParams['subActionParams']),
    [actionParams.subActionParams]
  );

  const labelOptions = useMemo(() => (ids ? ids.map((label: string) => ({ label })) : []), [ids]);

  const editSubActionParams = useCallback(
    (value: any) => {
      return editAction(
        'subActionParams',
        {
          ids: value,
        },
        index
      );
    },
    [editAction, index]
  );

  useEffect(() => {
    if (!actionParams.subAction) {
      editAction('subAction', SUB_ACTION.GET_AGENT_DETAILS, index);
    }
    if (!actionParams.subActionParams) {
      editAction(
        'subActionParams',
        {
          ids: [],
        },
        index
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionParams]);

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem>
        <EuiFormRow fullWidth label={i18n.ACTION_TYPE_LABEL}>
          <EuiSuperSelect
            fullWidth
            options={actionTypeOptions}
            valueOfSelected={subActionValue}
            readOnly={true}
            data-test-subj="actionTypeSelect"
          />
        </EuiFormRow>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFormRow
          fullWidth
          label={i18n.AGENT_IDS_LABEL}
          error={errors['subActionParams.ids'] as string[]}
        >
          <EuiComboBox
            noSuggestions
            fullWidth
            selectedOptions={labelOptions}
            onCreateOption={(searchValue: string) => {
              const newOptions = [...labelOptions, { label: searchValue }];
              editSubActionParams(newOptions.map((newOption) => newOption.label));
            }}
            onChange={(selectedOptions: Array<{ label: string }>) => {
              editSubActionParams(selectedOptions.map((selectedOption) => selectedOption.label));
            }}
            onBlur={() => {
              if (!ids) {
                editSubActionParams([]);
              }
            }}
            isClearable={true}
            data-test-subj="agentIdSelect"
          />
        </EuiFormRow>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

// eslint-disable-next-line import/no-default-export
export { CrowdstrikeParamsFields as default };
