import type { SerializableRecord } from '@kbn/utility-types';
export interface StreamsAppLocationParams extends SerializableRecord {
    name?: string;
    managementTab?: 'retention' | 'partitioning' | 'processing' | 'significantEvents' | string;
}
export interface StreamsAppLocation {
    app: 'streams';
    path: string;
}
export declare const getStreamsLocation: (params: StreamsAppLocationParams) => StreamsAppLocation;
