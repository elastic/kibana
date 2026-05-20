import type { BehaviorSubject} from 'rxjs';
import { type Observable } from 'rxjs';
import type { OverallSwimlaneData } from '../../application/explorer/explorer_utils';
import type { AnomalySwimlaneServices } from '../types';
import type { AnomalySwimLaneEmbeddableApi } from './types';
export declare const initializeSwimLaneDataFetcher: (swimLaneApi: AnomalySwimLaneEmbeddableApi, chartWidth$: Observable<number | undefined>, dataLoading$: BehaviorSubject<boolean | undefined>, blockingError$: BehaviorSubject<Error | undefined>, services: AnomalySwimlaneServices) => {
    swimLaneData$: BehaviorSubject<OverallSwimlaneData | undefined>;
    onDestroy: () => void;
};
