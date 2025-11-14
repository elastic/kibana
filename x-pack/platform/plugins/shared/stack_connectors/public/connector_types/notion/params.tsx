/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect } from 'react';
import { EuiFieldText, EuiFormRow } from '@elastic/eui';
import type { ActionParamsProps } from '@kbn/alerts-ui-shared';
import { SUB_ACTION } from '../../../common/notion/constants';
import type { NotionActionParams } from './types';

const NotionParamsFields: React.FunctionComponent<ActionParamsProps<NotionActionParams>> = ({
                                                                                              actionConnector,
                                                                                              actionParams,
                                                                                              editAction,
                                                                                              index,
                                                                                              executionMode,
                                                                                              errors,
                                                                                            }) => {
  const { subAction, subActionParams } = actionParams;

  // Set default subAction to GET_DATA_SOURCE for testing
  useEffect(() => {
    if (!subAction) {
      editAction('subAction', SUB_ACTION.GET_DATA_SOURCE, index);
    }
  }, [editAction, index, subAction]);

  return (
    <EuiFormRow
      fullWidth
      label="Data Source ID"
      helpText="Enter the Notion data source ID to retrieve"
      error={errors['subActionParams.dataSourceId'] as string[]}
      isInvalid={errors['subActionParams.dataSourceId']?.length > 0}
    >
      <EuiFieldText
        fullWidth
        name="dataSourceId"
        value={subActionParams?.dataSourceId || ''}
        placeholder="e.g., 12345678-1234-1234-1234-123456789012"
        onChange={(e) => {
          editAction(
            'subActionParams',
            { ...subActionParams, dataSourceId: e.target.value },
            index
          );
        }}
        data-test-subj="notion-dataSourceIdInput"
      />
    </EuiFormRow>
  );
};

// eslint-disable-next-line import/no-default-export
export { NotionParamsFields as default };
