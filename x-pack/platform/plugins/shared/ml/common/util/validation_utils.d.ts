import { VALIDATION_STATUS } from '@kbn/ml-validators';
export declare function getMostSevereMessageStatus(messages: Array<{
    status: string;
}>): VALIDATION_STATUS;
export declare function isValidJson(json: string): boolean;
export declare function findAggField(aggs: Record<string, any> | {
    [key: string]: any;
}, fieldName: string | undefined, returnParent?: boolean): any;
export declare function isValidAggregationField(aggs: Record<string, any>, fieldName: string): boolean;
