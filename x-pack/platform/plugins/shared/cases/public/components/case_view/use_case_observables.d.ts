import type { CaseUI } from '../../../common';
export declare const useCaseObservables: (caseData: CaseUI, searchTerm?: string) => {
    observables: never[];
    isLoading: boolean;
} | {
    observables: {
        id: string;
        createdAt: string;
        updatedAt: string | null;
        typeKey: string;
        value: string;
        description: string | null;
    }[];
    isLoading: false;
};
