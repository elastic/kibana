import type { FC } from 'react';
import type { JobOverride } from '@kbn/ml-common-types/modules';
import type { ModuleJobUI } from '../page';
interface EditJobProps {
    job: ModuleJobUI;
    jobOverride: JobOverride | undefined;
    existingGroupIds: string[];
    onClose: (job: JobOverride | null) => void;
}
/**
 * Edit job flyout for overriding job configuration.
 */
export declare const EditJob: FC<EditJobProps>;
export {};
