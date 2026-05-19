import type { ExtractedDatasetFields } from '@kbn/fields-metadata-plugin/server';
import type { RegistryDataStream } from '../../../../common';
import type { AssetsMap } from '../../../../common/types';
export declare const withPackageSpan: <T>(stepName: string, func: () => Promise<T>) => Promise<T>;
export declare const resolveDataStreamsMap: (dataStreams?: RegistryDataStream[]) => Map<string, RegistryDataStream>;
export declare const resolveDataStreamFields: ({ dataStream, assetsMap, excludedFieldsAssets, }: {
    dataStream: RegistryDataStream;
    assetsMap: AssetsMap;
    excludedFieldsAssets?: string[];
}) => {
    [x: string]: ExtractedDatasetFields;
};
export declare const setLastUploadInstallCache: () => Map<string, number>;
export declare const getLastUploadInstallCache: () => number | undefined;
