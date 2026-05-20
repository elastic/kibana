import type { OperationMetadata } from '@kbn/lens-common';
type OperationLike = Pick<OperationMetadata, 'dataType' | 'scale'>;
export declare const isTimeSeriesOperation: (operation?: OperationLike | null) => boolean;
export {};
