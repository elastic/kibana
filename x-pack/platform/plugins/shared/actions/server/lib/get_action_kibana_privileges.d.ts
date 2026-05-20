import type { ActionsClientContext } from '../actions_client';
import type { ActionExecutionSourceType } from './action_execution_source';
import type { ExecuteOptions } from './action_executor';
export declare function getActionKibanaPrivileges(context: ActionsClientContext, actionTypeId?: string, params?: ExecuteOptions['params'], source?: ActionExecutionSourceType): string[];
