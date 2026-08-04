import type { CaseUI } from '../../containers/types';
import type { OnUpdateFields } from './types';
export declare const useOnUpdateField: ({ caseData }: {
    caseData: CaseUI;
}) => {
    onUpdateField: ({ key, value, onSuccess, onError }: OnUpdateFields) => void;
    isLoading: boolean;
    loadingKey: string | null;
};
