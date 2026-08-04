import { Subject } from 'rxjs';
import type { Filter } from '@kbn/es-query';
import type { Query } from '@kbn/es-query';
export interface MapsAppState {
    query?: Query | null;
    savedQueryId?: string;
    filters?: Filter[];
}
export declare class AppStateManager {
    _query: Query | null;
    _savedQueryId: string;
    _filters: Filter[];
    _updated$: Subject<void>;
    setQueryAndFilters({ query, savedQueryId, filters }: MapsAppState): void;
    getQuery(): Query | null;
    getFilters(): Filter[];
    getAppState(): MapsAppState;
}
