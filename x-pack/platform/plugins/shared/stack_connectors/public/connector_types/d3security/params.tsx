/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { ActionConnectorMode, ActionParamsProps } from '@kbn/triggers-actions-ui-plugin/public';
import { JsonEditorWithMessageVariables } from '@kbn/triggers-actions-ui-plugin/public';
import { EuiFormRow } from '@elastic/eui';
import { EuiFieldText } from '@elastic/eui';
import { D3SecurityRunActionParams } from '../../../common/d3security/types';
import { SUB_ACTION } from '../../../common/d3security/constants';
import { D3SecurityActionParams } from './types';
import { OptionalFieldLabel } from '../../common/optional_field_label';

const D3ParamsFields: React.FunctionComponent<ActionParamsProps<D3SecurityActionParams>> = ({
  actionParams,
  editAction,
  index,
  messageVariables,
  executionMode,
  errors,
}) => {
  const { subAction, subActionParams } = actionParams;
  const { body, severity, eventType } = subActionParams ?? {};

  const isTest = useMemo(() => executionMode === ActionConnectorMode.Test, [executionMode]);

  useEffect(() => {
    if (!subAction) {
      editAction('subAction', isTest ? SUB_ACTION.TEST : SUB_ACTION.RUN, index);
    }
  }, [editAction, index, isTest, subAction]);

  const editSubActionParams = useCallback(
    (params: D3SecurityRunActionParams) => {
      editAction('subActionParams', { ...subActionParams, ...params }, index);
    },
    [editAction, index, subActionParams]
  );

  return (
    <>
      <EuiFormRow
        fullWidth
        error={errors.eventType as string}
        isInvalid={false}
        label={i18n.translate('xpack.stackConnectors.components.d3security.eventTypeFieldLabel', {
          defaultMessage: 'Event Type',
        })}
        labelAppend={OptionalFieldLabel}
      >
        <EuiFieldText
          data-test-subj="eventTypeInput"
          name="eventType"
          value={eventType}
          onChange={(e) => {
            editSubActionParams({ eventType: e.target.value });
          }}
          isInvalid={false}
          fullWidth={true}
        />
      </EuiFormRow>
      <EuiFormRow
        fullWidth
        error={errors.severity as string}
        isInvalid={false}
        label={i18n.translate('xpack.stackConnectors.components.d3security.severityFieldLabel', {
          defaultMessage: 'Severity',
        })}
        labelAppend={OptionalFieldLabel}
      >
        <EuiFieldText
          data-test-subj="severityInput"
          name="severity"
          value={severity}
          onChange={(e) => {
            editSubActionParams({ severity: e.target.value });
          }}
          isInvalid={false}
          fullWidth={true}
        />
      </EuiFormRow>

      <JsonEditorWithMessageVariables
        messageVariables={messageVariables}
        paramsProperty={'body'}
        inputTargetValue={body}
        label={i18n.translate('xpack.stackConnectors.components.d3security.bodyFieldLabel', {
          defaultMessage: 'Body',
        })}
        ariaLabel={i18n.translate(
          'xpack.stackConnectors.components.d3security.bodyCodeEditorAriaLabel',
          {
            defaultMessage: 'Code editor',
          }
        )}
        errors={errors.body as string[]}
        onDocumentsChange={(json: string) => {
          editSubActionParams({ body: json });
        }}
        onBlur={() => {
          if (!body) {
            editSubActionParams({ body: '' });
          }
        }}
        dataTestSubj="actionJsonEditor"
      />
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { D3ParamsFields as default };
