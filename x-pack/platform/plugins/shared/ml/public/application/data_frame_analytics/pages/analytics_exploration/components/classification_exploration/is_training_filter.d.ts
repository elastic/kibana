import type { ResultsSearchQuery } from '../../../../common/analytics';
export type IsTraining = boolean | undefined;
export declare function isTrainingFilter(searchQuery: ResultsSearchQuery, resultsField: string): IsTraining;
