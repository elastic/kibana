import { type UrlStateService } from '@kbn/ml-url-state';
import type { ExplorerAppState } from '@kbn/ml-common-types/locator';
export type AnomalyExplorerUrlStateService = UrlStateService<ExplorerAppState>;
export declare function useExplorerUrlState(): readonly [ExplorerAppState, (update: Partial<ExplorerAppState>, replaceState?: boolean) => void, UrlStateService<ExplorerAppState>];
