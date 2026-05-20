import type { JobType } from '@kbn/ml-common-types/saved_objects';
import type { JobIdObject } from './jobs_import_service';
export declare const useValidateIds: (jobType: JobType | null, jobIdObjects: JobIdObject[], idsMash: string, setJobIdObjects: (j: JobIdObject[]) => void, setValidatingJobs: (b: boolean) => void) => (() => Promise<void>)[];
