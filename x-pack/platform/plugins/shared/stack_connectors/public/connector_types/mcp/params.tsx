/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSelectOption } from '@elastic/eui';
import { EuiFormRow, EuiSelect } from '@elastic/eui';
import type { ActionParamsProps } from '@kbn/alerts-ui-shared';
import { SUB_ACTION } from '@kbn/connector-schemas/mcp/constants';
import type { CallToolParams } from '@kbn/connector-schemas/mcp';
import { JsonEditorWithMessageVariables } from '@kbn/triggers-actions-ui-plugin/public';
import React, { useCallback, useEffect, useRef } from 'react';
import { mcpParamsStrings } from './translations';
import type { MCPActionParams } from './types';

const DEFAULT_SUB_ACTION = SUB_ACTION.INITIALIZE;
const DEFAULT_CALL_TOOL_PARAMS: CallToolParams = { name: 'tool_name', arguments: {} };

const subActionOptions: EuiSelectOption[] = Object.values(SUB_ACTION).map((action) => ({
  text: action,
}));

const ParamsFields: React.FC<ActionParamsProps<MCPActionParams>> = ({
  actionParams,
  editAction,
  index,
  errors,
  messageVariables,
}) => {
  const { subAction, subActionParams, subActionParamsRaw } = actionParams;
  const prevSubActionParamsRaw = useRef<string | undefined>(subActionParamsRaw);
  const lastSyncedSubActionsParamsRaw = useRef<string | undefined>();

  const setSubAction = useCallback(
    (newSubAction: SUB_ACTION) => {
      editAction('subAction', newSubAction, index);
    },
    [editAction, index]
  );

  const setSubActionParams = useCallback(
    (newSubActionParams: MCPActionParams['subActionParams'] | undefined) => {
      editAction('subActionParams', newSubActionParams, index);
    },
    [editAction, index]
  );

  const setSubActionParamsRaw = useCallback(
    (newSubActionParamsRaw: string | undefined) => {
      editAction('subActionParamsRaw', newSubActionParamsRaw, index);
    },
    [editAction, index]
  );

  useEffect(() => {
    if (!subAction) {
      setSubAction(DEFAULT_SUB_ACTION);
    }
  }, [setSubAction, subAction]);

  useEffect(() => {
    const isCallTool = subAction === SUB_ACTION.CALL_TOOL;

    if (!isCallTool && subActionParamsRaw !== undefined) {
      // Save and clear when switching away from CALL_TOOL
      prevSubActionParamsRaw.current = subActionParamsRaw;
      setSubActionParamsRaw(undefined);
    }

    if (isCallTool && subActionParamsRaw === undefined) {
      // Restore or initialize when switching to CALL_TOOL
      setSubActionParamsRaw(
        prevSubActionParamsRaw.current ?? JSON.stringify(DEFAULT_CALL_TOOL_PARAMS)
      );
    }
  }, [setSubActionParamsRaw, subAction, subActionParamsRaw]);

  useEffect(() => {
    // This should occur onDocumentsChange such that both the subActionParamsRaw and subActionParams are set
    // However, editAction cannot be called in the same render cycle as state batching is not supported
    if (lastSyncedSubActionsParamsRaw.current === subActionParamsRaw) return;

    lastSyncedSubActionsParamsRaw.current = subActionParamsRaw;

    // Attempt to set subActionParams
    try {
      setSubActionParams(
        subActionParamsRaw !== undefined ? JSON.parse(subActionParamsRaw) : undefined
      );
    } catch (error) {
      // Ignore the parsing error
    }
  }, [setSubActionParams, subActionParams, subActionParamsRaw]);

  return (
    <>
      <EuiFormRow label={mcpParamsStrings.subAction.label}>
        <EuiSelect
          options={subActionOptions}
          value={subAction}
          onChange={(event) => setSubAction(event.target.value as SUB_ACTION)}
        />
      </EuiFormRow>
      {subAction === SUB_ACTION.CALL_TOOL && (
        <JsonEditorWithMessageVariables
          paramsProperty={'params'}
          label={mcpParamsStrings.params.label}
          messageVariables={messageVariables}
          errors={errors.subActionParams as string[]}
          inputTargetValue={subActionParamsRaw}
          onDocumentsChange={(json: string) => {
            setSubActionParamsRaw(json);
          }}
        />
      )}
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export default ParamsFields;
