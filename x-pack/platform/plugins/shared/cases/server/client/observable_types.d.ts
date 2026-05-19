import type { ObservableType } from '../../common/types/domain';
import type { CasesClient } from './client';
export declare const getAvailableObservableTypes: (casesClient: CasesClient, owner: string) => Promise<{
    key: string;
    label: string;
}[]>;
export declare const getAvailableObservableTypesMap: (casesClient: CasesClient, owner: string) => Promise<Map<string, ObservableType>>;
