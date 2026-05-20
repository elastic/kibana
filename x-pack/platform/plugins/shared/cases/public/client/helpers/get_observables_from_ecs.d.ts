import type { ObservablePost } from '../../../common/types/api';
export declare const getIPType: (ip: string) => "IPV4" | "IPV6";
export type Maybe<T> = T | null;
export interface FlattedEcsData {
    field: string;
    value?: Maybe<string[]>;
}
export declare const getHashFields: () => string[];
export declare const processObservable: (observablesMap: Map<string, ObservablePost>, value: string, typeKey: string, description: string) => void;
export declare const getObservablesFromEcs: (ecsDataArray: FlattedEcsData[][]) => ObservablePost[];
