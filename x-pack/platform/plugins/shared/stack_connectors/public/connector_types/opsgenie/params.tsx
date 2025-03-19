/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useRef } from 'react';
import {
  ActionParamsProps,
  ActionConnectorMode,
  IErrorObject,
} from '@kbn/triggers-actions-ui-plugin/public';
import { EuiFormRow, EuiSelect } from '@elastic/eui';
import { isEmpty, unset, cloneDeep } from 'lodash';
import { OpsgenieSubActions } from '../../../common';
import * as i18n from './translations';
import { CreateAlert, isPartialCreateAlertSchema } from './create_alert';
import { CloseAlert } from './close_alert';
import { isPartialCloseAlertSchema } from './close_alert_schema';
import type {
  OpsgenieActionParams,
  OpsgenieCreateAlertSubActionParams,
} from '../../../server/connector_types';
import { EditActionCallback } from './types';

const actionOptions = [
  {
    value: OpsgenieSubActions.CreateAlert,
    text: i18n.CREATE_ALERT_ACTION,
    'data-test-subj': 'opsgenie-subActionSelect-create-alert',
  },
  {
    value: OpsgenieSubActions.CloseAlert,
    text: i18n.CLOSE_ALERT_ACTION,
    'data-test-subj': 'opsgenie-subActionSelect-close-alert',
  },
];

const OpsgenieParamFields: React.FC<ActionParamsProps<OpsgenieActionParams>> = ({
  actionParams,
  editAction,
  errors,
  index,
  messageVariables,
  executionMode,
}) => {
  const { subAction, subActionParams } = actionParams;

  const currentSubAction = useRef<string>(subAction ?? OpsgenieSubActions.CreateAlert);

  const onActionChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      editAction('subAction', event.target.value, index);
    },
    [editAction, index]
  );

  const editOptionalSubAction: EditActionCallback = useCallback(
    (key, value) => {
      if (isEmpty(value)) {
        const paramsCopy = cloneDeep(subActionParams);
        unset(paramsCopy, key);
        editAction('subActionParams', paramsCopy, index);
        return;
      }

      editAction('subActionParams', { ...subActionParams, [key]: value }, index);
    },
    [editAction, index, subActionParams]
  );

  const editSubAction: EditActionCallback = useCallback(
    (key, value) => {
      editAction('subActionParams', { ...subActionParams, [key]: value }, index);
    },
    [editAction, index, subActionParams]
  );

  useEffect(() => {
    if (!subAction) {
      editAction('subAction', OpsgenieSubActions.CreateAlert, index);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, subAction]);

  useEffect(() => {
    if (subAction != null && currentSubAction.current !== subAction) {
      currentSubAction.current = subAction;

      // check for a mismatch in the subAction and params, if the subAction does not match the params then we need to
      // clear them by calling editAction. We can carry over the alias if it exists
      if (
        (subAction === OpsgenieSubActions.CreateAlert &&
          !isPartialCreateAlertSchema(subActionParams)) ||
        (subAction === OpsgenieSubActions.CloseAlert && !isPartialCloseAlertSchema(subActionParams))
      ) {
        const params = subActionParams?.alias ? { alias: subActionParams.alias } : undefined;
        editAction('subActionParams', params, index);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subAction, currentSubAction, index, subActionParams]);

  return (
    <>
      {executionMode === ActionConnectorMode.Test && (
        <EuiFormRow fullWidth label={i18n.ACTION_LABEL}>
          <EuiSelect
            fullWidth
            data-test-subj="opsgenie-subActionSelect"
            options={actionOptions}
            hasNoInitialSelection={subAction == null}
            value={subAction}
            onChange={onActionChange}
          />
        </EuiFormRow>
      )}

      {subAction === OpsgenieSubActions.CreateAlert && (
        <CreateAlert
          showSaveError={showCreateAlertSaveError(actionParams, errors)}
          subActionParams={subActionParams}
          editAction={editAction}
          editSubAction={editSubAction}
          editOptionalSubAction={editOptionalSubAction}
          errors={errors}
          index={index}
          messageVariables={messageVariables}
        />
      )}

      {subAction === OpsgenieSubActions.CloseAlert && (
        <CloseAlert
          showSaveError={showCloseAlertSaveError(actionParams, errors)}
          subActionParams={subActionParams}
          editSubAction={editSubAction}
          editOptionalSubAction={editOptionalSubAction}
          errors={errors}
          index={index}
          messageVariables={messageVariables}
        />
      )}
    </>
  );
};

OpsgenieParamFields.displayName = 'OpsgenieParamFields';

/**
 * The show*AlertSaveError functions are used to cause a rerender when fields are set to `null` when a user attempts to
 * save the form before providing values for the required fields (message for creating an alert and alias for closing an alert).
 * If we only passed in subActionParams the child components would not rerender because the objects field is only updated
 * and not the entire object.
 */

const showCreateAlertSaveError = (
  params: Partial<OpsgenieActionParams>,
  errors: IErrorObject
): boolean => {
  const errorArray = errors['subActionParams.message'] as string[] | undefined;
  const errorsLength = errorArray?.length ?? 0;

  return (
    isCreateAlertParams(params) && params.subActionParams?.message === null && errorsLength > 0
  );
};

const showCloseAlertSaveError = (
  params: Partial<OpsgenieActionParams>,
  errors: IErrorObject
): boolean => {
  const errorArray = errors['subActionParams.alias'] as string[] | undefined;
  const errorsLength = errorArray?.length ?? 0;

  return isCloseAlertParams(params) && params.subActionParams?.alias === null && errorsLength > 0;
};

const isCreateAlertParams = (
  params: Partial<OpsgenieActionParams>
): params is Partial<OpsgenieCreateAlertSubActionParams> =>
  params.subAction === OpsgenieSubActions.CreateAlert;

const isCloseAlertParams = (
  params: Partial<OpsgenieActionParams>
): params is OpsgenieCreateAlertSubActionParams =>
  params.subAction === OpsgenieSubActions.CloseAlert;

// eslint-disable-next-line import/no-default-export
export { OpsgenieParamFields as default };
