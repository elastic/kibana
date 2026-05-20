import type { FieldFormat } from '@kbn/field-formats-plugin/common';
import type { MlJobService } from './job_service';
import type { MlIndexUtils } from '../util/index_service';
import type { MlApi } from './ml_api_service';
type FormatsByJobId = Record<string, FieldFormat[]>;
type IndexPatternIdsByJob = Record<string, any>;
export declare class FieldFormatService {
    private mlApi;
    private mlIndexUtils;
    private mlJobService;
    indexPatternIdsByJob: IndexPatternIdsByJob;
    formatsByJob: FormatsByJobId;
    constructor(mlApi: MlApi, mlIndexUtils: MlIndexUtils, mlJobService: MlJobService);
    populateFormats(jobIds: string[]): Promise<FormatsByJobId>;
    getFieldFormat(jobId: string, detectorIndex: number): FieldFormat | undefined;
    getFormatsForJob(jobId: string): Promise<FieldFormat[]>;
}
export type MlFieldFormatService = FieldFormatService;
export {};
