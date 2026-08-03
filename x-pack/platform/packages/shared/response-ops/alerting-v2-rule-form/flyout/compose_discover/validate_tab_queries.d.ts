import type { ESQLCallbacks } from '@kbn/esql-types';
import type { QueryTab } from './types';
export interface TabValidationError {
    tab: QueryTab;
    messages: string[];
}
export declare const validateTabQueries: (queries: Partial<Record<QueryTab, string>>, callbacks: ESQLCallbacks) => Promise<TabValidationError[]>;
