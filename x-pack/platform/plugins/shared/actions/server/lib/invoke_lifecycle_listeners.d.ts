import type { Logger } from '@kbn/logging';
import type { ConnectorLifecycleListener, ConnectorLifecyclePostCreateParams, ConnectorLifecyclePostDeleteParams } from '../types';
export declare function invokePostCreateListeners(listeners: ConnectorLifecycleListener[] | undefined, connectorType: string, params: Omit<ConnectorLifecyclePostCreateParams, 'connectorType'>, logger: Logger): Promise<void>;
export declare function invokePostDeleteListeners(listeners: ConnectorLifecycleListener[] | undefined, connectorType: string, params: Omit<ConnectorLifecyclePostDeleteParams, 'connectorType'>, logger: Logger): Promise<void>;
