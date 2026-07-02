import type { ExecuteOptions } from '../../../../../lib/action_executor';
export type ConnectorExecuteParams = Omit<ExecuteOptions, 'request' | 'actionExecutionId'>;
