/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { ActionConnectorMode, ActionParamsProps } from '@kbn/triggers-actions-ui-plugin/public';
import { EuiFormRow } from '@elastic/eui';
import { EuiFieldText } from '@elastic/eui';
import { HelloWorldRunActionParams } from '../../../common/hello_world/everything';
import { SUB_ACTION } from '../../../common/d3security/constants';
import { HelloWorldActionParams } from '.';
import { OptionalFieldLabel } from '../../common/optional_field_label';

const HelloWorldFields: React.FunctionComponent<ActionParamsProps<HelloWorldActionParams>> = ({
  actionParams,
  editAction,
  index,
  messageVariables,
  executionMode,
  errors,
}) => {
  const { subAction, subActionParams } = actionParams;
  const { question } = subActionParams ?? {};

  const isTest = useMemo(() => executionMode === ActionConnectorMode.Test, [executionMode]);

  useEffect(() => {
    if (!subAction) {
      editAction('subAction', isTest ? SUB_ACTION.TEST : SUB_ACTION.RUN, index);
    }
  }, [editAction, index, isTest, subAction]);

  const editSubActionParams = useCallback(
    (params: HelloWorldRunActionParams) => {
      editAction('subActionParams', { ...subActionParams, ...params }, index);
    },
    [editAction, index, subActionParams]
  );

  return (
    <>
      <EuiFormRow
        fullWidth
        error={errors.question as string}
        isInvalid={false}
        label={i18n.translate('xpack.stackConnectors.components.helloWorld.questionFieldLabel', {
          defaultMessage: 'Question',
        })}
        labelAppend={OptionalFieldLabel}
      >
        <EuiFieldText
          data-test-subj="questionInput"
          name="question"
          value={question}
          onChange={(e) => {
            editSubActionParams({ question: e.target.value });
          }}
          isInvalid={false}
          fullWidth={true}
        />
      </EuiFormRow>
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { HelloWorldFields as default };
