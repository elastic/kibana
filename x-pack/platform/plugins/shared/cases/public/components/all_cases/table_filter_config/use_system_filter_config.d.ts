import type { CaseStatuses } from '../../../../common/types/domain';
import type { CurrentUserProfile } from '../../types';
import type { FilterChangeHandler, FilterConfig } from './types';
interface UseFilterConfigProps {
    availableSolutions: string[];
    caseAssignmentAuthorized: boolean;
    categories: string[];
    countClosedCases: number | null;
    countInProgressCases: number | null;
    countOpenCases: number | null;
    currentUserProfile: CurrentUserProfile;
    hiddenStatuses?: CaseStatuses[];
    isLoading: boolean;
    isSelectorView?: boolean;
    onFilterOptionsChange: FilterChangeHandler;
    tags: string[];
}
export declare const getSystemFilterConfig: ({ availableSolutions, caseAssignmentAuthorized, categories, countClosedCases, countInProgressCases, countOpenCases, currentUserProfile, hiddenStatuses, isLoading, isSelectorView, onFilterOptionsChange, tags, }: UseFilterConfigProps) => FilterConfig[];
export declare const useSystemFilterConfig: ({ availableSolutions, caseAssignmentAuthorized, categories, countClosedCases, countInProgressCases, countOpenCases, currentUserProfile, hiddenStatuses, isLoading, isSelectorView, onFilterOptionsChange, tags, }: UseFilterConfigProps) => {
    systemFilterConfig: FilterConfig[];
};
export {};
