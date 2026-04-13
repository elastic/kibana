import type { IToasts } from '@kbn/core-notifications-browser';
import type { DatasetQualityDetailsPublicState } from '@kbn/dataset-quality-plugin/public/controller/dataset_quality_details';
import type { IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import type { DatasetQualityDetailsPublicStateUpdate } from '@kbn/dataset-quality-plugin/public/controller/dataset_quality_details';
export declare const updateUrlFromDatasetQualityDetailsState: ({ urlStateStorageContainer, datasetQualityDetailsState, setTime, }: {
    urlStateStorageContainer: IKbnUrlStateStorage;
    datasetQualityDetailsState?: DatasetQualityDetailsPublicState;
    setTime: (time: {
        from: string;
        to: string;
    }) => void;
}) => void;
export declare const getDatasetQualityDetailsStateFromUrl: ({ toastsService, urlStateStorageContainer, }: {
    toastsService: IToasts;
    urlStateStorageContainer: IKbnUrlStateStorage;
}) => DatasetQualityDetailsPublicStateUpdate | undefined | null;
