/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFormRow, EuiSelect } from '@elastic/eui';
import {
  MCPCallToolParams,
  MCPConnectorSubActionType,
  MCPExecutorParams,
  MCPListToolsParams,
} from '@kbn/mcp-connector-common';
import { ActionParamsProps } from '@kbn/triggers-actions-ui-plugin/public';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { EVENT_ACTION_LABEL } from './translations';

const MCPParamsFields: React.FunctionComponent<ActionParamsProps<MCPExecutorParams>> = ({
  actionConnector,
  actionParams,
  editAction,
  index,
  errors,
  messageVariables,
  executionMode,
}) => {
  const [eventAction, setEventAction] = useState(actionParams.subAction ?? 'listTools');

  const editActionRef = useRef(editAction);
  editActionRef.current = editAction;

  const setWithDefaults = useCallback(
    <T extends MCPConnectorSubActionType>(
      subAction: T,
      values: T extends 'listTools' | 'listToolsViaHub'
        ? MCPListToolsParams['subActionParams']
        : MCPCallToolParams['subActionParams']
    ) => {
      setEventAction(subAction);
      editActionRef.current('subAction', subAction, index);
      editActionRef.current('subActionParams', values, index);
    },
    [index]
  );

  useEffect(() => {
    setWithDefaults('listTools', {});
  }, [actionConnector?.id, setWithDefaults]);

  const setEventActionType = useCallback(
    (eventActionType: MCPConnectorSubActionType) => {
      switch (eventActionType) {
        case 'listTools':
          setWithDefaults('listTools', {});
          break;
        case 'listToolsViaHub':
          setWithDefaults('listToolsViaHub', {});
          break;
        case 'callTool':
        default:
          setWithDefaults('callTool', { name: 'my_tool', arguments: {} });
      }
    },
    [setWithDefaults]
  );

  return (
    <>
      <EuiFormRow fullWidth label={EVENT_ACTION_LABEL}>
        <EuiSelect
          fullWidth
          data-test-subj="eventActionSelect"
          options={[
            {
              text: 'List tools',
              value: 'listTools',
            },
            {
              text: 'Call tool',
              value: 'callTool',
            },
            {
              text: 'List tools via hub',
              value: 'listToolsViaHub',
            },
          ]}
          value={eventAction}
          onChange={(e) => setEventActionType(e.target.value as MCPConnectorSubActionType)}
        />
      </EuiFormRow>
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { MCPParamsFields as default };
