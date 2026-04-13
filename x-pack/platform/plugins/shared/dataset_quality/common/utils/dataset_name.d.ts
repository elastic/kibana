import type { DataStreamType } from '../types';
export interface DataStreamNameParts {
    type: DataStreamType;
    dataset: string;
    namespace: string;
}
export declare const streamPartsToIndexPattern: ({ typePattern, datasetPattern, }: {
    datasetPattern: string;
    typePattern: string;
}) => string;
export declare const dataStreamPartsToIndexName: ({ type, dataset, namespace }: DataStreamNameParts) => string;
export declare const indexNameToDataStreamParts: (dataStreamName: string) => {
    type: DataStreamType;
    dataset: string;
    namespace: string;
};
export declare const extractIndexNameFromBackingIndex: (indexString: string) => string;
