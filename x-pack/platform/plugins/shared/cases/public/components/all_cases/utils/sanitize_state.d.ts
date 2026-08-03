import type { AllCasesTableState } from '../types';
interface PartialState {
    queryParams?: Partial<AllCasesTableState['queryParams']>;
    filterOptions?: Partial<AllCasesTableState['filterOptions']>;
}
interface PartialParams {
    queryParams: Partial<AllCasesTableState['queryParams']>;
    filterOptions: Partial<AllCasesTableState['filterOptions']>;
}
export declare const sanitizeState: (state?: PartialState) => PartialParams;
export {};
