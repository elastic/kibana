import type { LogSourcesService } from '../../../common/types';
import type { RegisterServicesParams } from '../register_services';
import type { LogDataService } from './types';
export declare function createLogDataService(params: RegisterServicesParams & {
    logSourcesService: LogSourcesService;
}): LogDataService;
