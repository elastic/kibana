import type { FC } from 'react';
import type { COMBINED_JOB_STATE } from '../model_snapshots_table';
interface Props {
    combinedJobState: COMBINED_JOB_STATE;
    hideCloseJobModalVisible(): void;
    forceCloseJob(): void;
}
export declare const CloseJobConfirm: FC<Props>;
export {};
