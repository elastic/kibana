import type { ExplorationPageUrlState } from '@kbn/ml-common-types/locator';
export declare function getDefaultExplorationPageUrlState(overrides?: Partial<ExplorationPageUrlState>): ExplorationPageUrlState;
export declare function useExplorationUrlState(overrides?: Partial<ExplorationPageUrlState>): [ExplorationPageUrlState, (update: Partial<ExplorationPageUrlState>, replaceState?: boolean) => void, import("@kbn/ml-url-state").UrlStateService<ExplorationPageUrlState>];
