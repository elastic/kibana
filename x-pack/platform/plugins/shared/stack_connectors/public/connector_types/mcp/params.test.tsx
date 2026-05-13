/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { SUB_ACTION } from '@kbn/connector-schemas/mcp/constants';
import ParamsFields from './params';
import { I18nProvider } from '@kbn/i18n-react';
import type { MCPActionParams } from './types';

const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <I18nProvider>{children}</I18nProvider>
);

describe('MCP ParamsFields', () => {
  it('should default subAction to "initialize" when missing', () => {
    const editAction = jest.fn();
    const actionParams: Partial<MCPActionParams> = {};

    render(
      <ParamsFields
        actionParams={actionParams}
        editAction={editAction}
        index={0}
        errors={{ subActionParams: [] }}
        messageVariables={[]}
      />,
      { wrapper }
    );

    expect(editAction).toHaveBeenCalledWith('subAction', SUB_ACTION.INITIALIZE, 0);
  });

  it('should render JSON editor only for "call_tool"', () => {
    const actionParams: Partial<MCPActionParams> = {
      subAction: SUB_ACTION.CALL_TOOL,
      subActionParamsRaw: JSON.stringify({ name: 'tool', arguments: {} }),
    };

    const { getByLabelText } = render(
      <ParamsFields
        actionParams={actionParams}
        editAction={jest.fn()}
        index={0}
        errors={{ subActionParams: [] }}
        messageVariables={[]}
      />,
      { wrapper }
    );

    expect(getByLabelText('Parameters')).toBeInTheDocument();
  });

  it('should hide JSON editor for non "call_tool" actions', () => {
    const actionParams: Partial<MCPActionParams> = {
      subAction: SUB_ACTION.INITIALIZE,
    };

    const { queryByLabelText } = render(
      <ParamsFields
        actionParams={actionParams}
        editAction={jest.fn()}
        index={0}
        errors={{ subActionParams: [] }}
        messageVariables={[]}
      />,
      { wrapper }
    );

    expect(queryByLabelText('Parameters')).not.toBeInTheDocument();
  });

  it('should initialize "call_tool" params when missing', () => {
    const editAction = jest.fn();
    const actionParams: Partial<MCPActionParams> = {
      subAction: SUB_ACTION.CALL_TOOL,
    };

    render(
      <ParamsFields
        actionParams={actionParams}
        editAction={editAction}
        index={0}
        errors={{ subActionParams: [] }}
        messageVariables={[]}
      />,
      { wrapper }
    );

    const call = editAction.mock.calls.find(
      ([field]: [string, unknown, number]) => field === 'subActionParamsRaw'
    );

    expect(call).toBeDefined();
    expect(JSON.parse(call[1] as string)).toEqual({ name: 'tool_name', arguments: {} });
  });
});
