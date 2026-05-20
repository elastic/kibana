import type { FC } from 'react';
import type { Validation } from '../job_validator';
export interface JobGroupsInputProps {
    existingGroups: string[];
    selectedGroups: string[];
    onChange: (value: string[]) => void;
    validation: Validation;
}
export declare const JobGroupsInput: FC<JobGroupsInputProps>;
