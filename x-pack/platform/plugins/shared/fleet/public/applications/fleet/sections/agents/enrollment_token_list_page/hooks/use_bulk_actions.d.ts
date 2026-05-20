import type { EnrollmentAPIKey } from '../../../../types';
import type { BulkAction } from '../components/token_actions';
type SelectionMode = 'manual' | 'query';
export declare const useBulkActions: ({ kuery, selectedTokens, selectionMode, refresh, }: {
    kuery: string;
    selectedTokens: EnrollmentAPIKey[];
    selectionMode: SelectionMode;
    refresh: () => void;
}) => {
    bulkActionPending: BulkAction | null;
    setBulkActionPending: import("react").Dispatch<import("react").SetStateAction<BulkAction | null>>;
    isBulkActionInProgress: boolean;
    onBulkActionConfirm: () => Promise<void>;
};
export {};
