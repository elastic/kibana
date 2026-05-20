import type { FilterOptions } from '../../containers/types';
/**
 * Returns the earliest case from the cases list for the given owner.
 */
export declare const useGetEarliestCase: (filterOptions: Partial<FilterOptions>) => {
    earliestCase: import("../../containers/types").CaseUI | undefined;
    isLoading: boolean;
};
