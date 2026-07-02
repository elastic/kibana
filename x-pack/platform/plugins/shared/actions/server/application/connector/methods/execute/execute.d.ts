import type { ActionTypeExecutorResult } from '../../../../types';
import type { ConnectorExecuteParams } from './types';
import type { ActionsClientContext } from '../../../../actions_client';
export declare function execute(context: ActionsClientContext, connectorExecuteParams: ConnectorExecuteParams): Promise<ActionTypeExecutorResult<unknown>>;
