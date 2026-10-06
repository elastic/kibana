import type { IRouter, Logger, SecurityServiceStart } from '@kbn/core/server';
import type { TaskExecutionControlService } from '../execution_control';
import type { TaskTypeDictionary } from '../task_type_dictionary';
export interface ExecutionControlRouteParams {
    router: IRouter;
    logger: Logger;
    getSecurity: () => Promise<SecurityServiceStart>;
    getExecutionControlService: () => Promise<TaskExecutionControlService>;
    getDefinitions: () => TaskTypeDictionary;
}
export declare function executionControlRoutes(params: ExecutionControlRouteParams): void;
