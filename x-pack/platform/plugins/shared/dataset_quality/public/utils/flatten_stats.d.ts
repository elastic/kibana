import type { DataStreamType } from '../../common/types';
export declare function flattenStats<T>(stats: Record<DataStreamType, T[]>): Array<T & {
    type: DataStreamType;
}>;
