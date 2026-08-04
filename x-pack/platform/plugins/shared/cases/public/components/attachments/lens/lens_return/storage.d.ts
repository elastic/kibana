import type { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';
export interface PendingLensAttach {
    caseId: string;
    caseOwner: string;
    savedObjectId: string;
    title: string;
}
export declare const setPendingLensAttach: (storage: IStorageWrapper, record: PendingLensAttach) => void;
export declare const getPendingLensAttach: (storage: IStorageWrapper) => PendingLensAttach | null;
export declare const clearPendingLensAttach: (storage: IStorageWrapper) => void;
