import { AGG_TYPE } from './constants';
export declare function getJoinAggKey({ aggType, aggFieldName, rightSourceId, }: {
    aggType: AGG_TYPE;
    aggFieldName?: string;
    rightSourceId: string;
}): string;
export declare function getSourceAggKey({ aggType, aggFieldName, }: {
    aggType: AGG_TYPE;
    aggFieldName?: string;
}): string;
