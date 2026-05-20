import type { FC, ReactNode } from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import type { JobId } from '@kbn/ml-common-types/anomaly_detection_jobs/job';
import type { MlApi } from '../application/services/ml_api_service';
export interface JobSelection {
    jobIds?: JobId[];
    groupIds?: string[];
}
export interface JobSelectorControlProps {
    jobsAndGroupIds?: string[];
    onChange: (jobSelection: JobSelection) => void;
    adJobsApiService: MlApi['jobs'];
    /**
     * Validation is handled by alerting framework
     */
    errors?: string[];
    /** Enables multiple selection of jobs and groups */
    multiSelect?: boolean;
    label?: ReactNode;
    /**
     * Allows selecting all jobs, even those created afterward.
     */
    allowSelectAll?: boolean;
    /** Adds an option to create a new anomaly detection job */
    createJobUrl?: string;
    /**
     * Available options to select. By default suggest all existing jobs.
     */
    options?: Array<EuiComboBoxOptionOption<string>>;
    /**
     * Flag to indicate whether to use the job creation button in the empty prompt or the dropdown when no jobs are available.
     */
    shouldUseDropdownJobCreate?: boolean;
}
export declare const JobSelectorControl: FC<JobSelectorControlProps>;
