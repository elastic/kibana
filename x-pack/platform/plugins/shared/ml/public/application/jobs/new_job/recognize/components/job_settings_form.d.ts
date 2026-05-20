import type { FC } from 'react';
import type { ModuleJobUI } from '../page';
import type { SAVE_STATE } from '../page';
import type { TimeRange } from '../../common/components';
export interface JobSettingsFormValues {
    jobPrefix: string;
    startDatafeedAfterSave: boolean;
    useFullIndexData: boolean;
    timeRange: TimeRange;
    useDedicatedIndex: boolean;
}
interface JobSettingsFormProps {
    saveState: SAVE_STATE;
    onSubmit: (values: JobSettingsFormValues) => void;
    onJobPrefixChange: (jobPrefix: string) => void;
    jobs: ModuleJobUI[];
}
export declare const JobSettingsForm: FC<JobSettingsFormProps>;
export {};
