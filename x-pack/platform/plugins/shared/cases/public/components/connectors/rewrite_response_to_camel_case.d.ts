import type { ActionTypeExecutorResult, RewriteResponseCase } from '@kbn/actions-plugin/common';
export type ConnectorExecutorResult<T> = ReturnType<RewriteResponseCase<ActionTypeExecutorResult<T>>>;
export declare const rewriteResponseToCamelCase: <T>({ connector_id: actionId, service_message: serviceMessage, ...data }: ConnectorExecutorResult<T>) => ActionTypeExecutorResult<T>;
