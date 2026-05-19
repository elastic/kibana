import type { FeatureCollection } from 'geojson';
import type { DataRequestContext } from '../../../../actions';
import type { JoinState } from '../types';
interface SourceResult {
    refreshed: boolean;
    featureCollection: FeatureCollection;
}
export declare function performInnerJoins(sourceResult: SourceResult, joinStates: JoinState[], updateSourceData: DataRequestContext['updateSourceData'], setJoinError: DataRequestContext['setJoinError']): Promise<void>;
export {};
