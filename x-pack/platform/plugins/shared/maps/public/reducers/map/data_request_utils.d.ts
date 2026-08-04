import type { DataRequestMeta, DataRequestDescriptor } from '../../../common/descriptor_types';
import type { MapState } from './types';
export declare function startDataRequest(state: MapState, layerId: string, dataRequestId: string, requestToken: symbol, requestMeta: DataRequestMeta): MapState;
export declare function updateSourceDataRequest(state: MapState, layerId: string, newData: object): MapState;
export declare function stopDataRequest(state: MapState, layerId: string, dataRequestId: string, requestToken: symbol, responseMeta?: DataRequestMeta, data?: object, error?: Error): MapState;
export declare function setDataRequest(state: MapState, layerId: string, dataRequest: DataRequestDescriptor): MapState;
export declare function getDataRequest(state: MapState, layerId: string, dataRequestId: string, requestToken?: symbol): DataRequestDescriptor | undefined;
