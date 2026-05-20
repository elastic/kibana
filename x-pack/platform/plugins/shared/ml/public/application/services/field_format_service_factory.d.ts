import { type MlFieldFormatService } from './field_format_service';
import type { MlIndexUtils } from '../util/index_service';
import type { MlApi } from './ml_api_service';
import type { MlJobService } from './job_service';
export declare function fieldFormatServiceFactory(mlApi: MlApi, mlIndexUtils: MlIndexUtils, mlJobService: MlJobService): MlFieldFormatService;
