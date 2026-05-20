export type ActiveFilter = 'active' | 'inactive' | 'all';
export declare function buildKuery(search: string, selectedPolicyIds: string[], activeFilter: ActiveFilter, excludedPolicyIds: string[]): string;
