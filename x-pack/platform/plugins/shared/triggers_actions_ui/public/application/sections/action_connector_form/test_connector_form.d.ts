import React from 'react';
import type { Option } from 'fp-ts/Option';
import type { ActionTypeExecutorResult } from '@kbn/actions-plugin/common';
import type { ActionConnector, ActionTypeModel } from '../../../types';
export interface TestConnectorFormProps {
    connector: ActionConnector;
    executeEnabled: boolean;
    isExecutingAction: boolean;
    onEditAction: (field: string, value: unknown) => void;
    actionParams: Record<string, unknown>;
    onExecutionAction: () => Promise<void>;
    executionResult: Option<ActionTypeExecutorResult<unknown> | undefined>;
    actionTypeModel: ActionTypeModel;
    hideActionParamsStep?: boolean;
}
export declare const TestConnectorForm: ({ connector, executeEnabled, executionResult, actionParams, onEditAction, onExecutionAction, isExecutingAction, actionTypeModel, hideActionParamsStep, }: TestConnectorFormProps) => React.JSX.Element;
export { TestConnectorForm as default };
