/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ActionParamsProps, ActionConnectorMode } from '@kbn/triggers-actions-ui-plugin/public';
import { EuiFormRow, EuiSelect } from '@elastic/eui';
import { eventActionOptions } from './constants';
import { SUB_ACTION } from '../../../common/thehive/constants';
import { ExecutorParams } from '../../../common/thehive/types';
import { TheHiveParamsAlertFields } from './params_alert';
import { TheHiveParamsCaseFields } from './params_case';
import * as translations from './translations';

const TheHiveParamsFields: React.FunctionComponent<ActionParamsProps<ExecutorParams>> = ({
  actionConnector,
  actionParams,
  editAction,
  index,
  errors,
  messageVariables,
  executionMode,
}) => {
  const [eventAction, setEventAction] = useState(
    actionParams.subAction ?? SUB_ACTION.PUSH_TO_SERVICE
  );
  const actionConnectorRef = useRef(actionConnector?.id ?? '');
  const isTest = useMemo(() => executionMode === ActionConnectorMode.Test, [executionMode]);

  useEffect(() => {
    if (actionConnector != null && actionConnectorRef.current !== actionConnector.id) {
      actionConnectorRef.current = actionConnector.id;
      editAction(
        'subActionParams',
        {
          incident: {
            tlp: 2,
            severity: 2,
            tags: [],
          },
          comments: [],
        },
        index
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionConnector]);

  useEffect(() => {
    if (!actionParams.subAction) {
      editAction('subAction', SUB_ACTION.PUSH_TO_SERVICE, index);
    }
    if (!actionParams.subActionParams) {
      editAction(
        'subActionParams',
        {
          incident: {
            tlp: 2,
            severity: 2,
            tags: [],
          },
          comments: [],
        },
        index
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionParams]);

  useEffect(() => {
    editAction('subAction', eventAction, index);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventAction]);

  const setEventActionType = (eventActionType: SUB_ACTION) => {
    const subActionParams =
      eventActionType === SUB_ACTION.CREATE_ALERT
        ? {
            tlp: 2,
            severity: 2,
            tags: [],
            sourceRef: isTest ? undefined : '{{alert.uuid}}',
          }
        : {
            incident: {
              tlp: 2,
              severity: 2,
              tags: [],
            },
            comments: [],
          };

    setEventAction(eventActionType);
    editAction('subActionParams', subActionParams, index);
  };

  return (
    <>
      <EuiFormRow fullWidth label={translations.EVENT_ACTION_LABEL}>
        <EuiSelect
          fullWidth
          data-test-subj="eventActionSelect"
          options={eventActionOptions}
          value={eventAction}
          onChange={(e) => setEventActionType(e.target.value as SUB_ACTION)}
        />
      </EuiFormRow>
      {eventAction === SUB_ACTION.PUSH_TO_SERVICE ? (
        <TheHiveParamsCaseFields
          actionParams={actionParams}
          editAction={editAction}
          index={index}
          errors={errors}
          messageVariables={messageVariables}
        />
      ) : (
        <TheHiveParamsAlertFields
          actionParams={actionParams}
          editAction={editAction}
          index={index}
          errors={errors}
          messageVariables={messageVariables}
        />
      )}
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { TheHiveParamsFields as default };
