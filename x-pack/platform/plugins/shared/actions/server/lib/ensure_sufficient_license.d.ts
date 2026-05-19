import type { ActionType } from '../types';
import type { ActionTypeConfig, ActionTypeSecrets, ActionTypeParams } from '../types';
export declare function ensureSufficientLicense<Config extends ActionTypeConfig, Secrets extends ActionTypeSecrets, Params extends ActionTypeParams, ExecutorResultData>(actionType: ActionType<Config, Secrets, Params, ExecutorResultData>): void;
