import { type DataView } from '@kbn/data-views-plugin/common';
import { type DataViewsContract } from '@kbn/data-views-plugin/public';
import type { PublishingSubject } from '@kbn/presentation-publishing';
import type { Subscription } from 'rxjs';
import { type AnomalyDetectorService } from '../../application/services/anomaly_detector_service';
import type { AnomalySwimLaneEmbeddableApi } from '../anomaly_swimlane/types';
export declare const buildDataViewPublishingApi: (services: {
    anomalyDetectorService: AnomalyDetectorService;
    dataViewsService: DataViewsContract;
}, api: Pick<AnomalySwimLaneEmbeddableApi, "jobIds">, subscription: Subscription) => PublishingSubject<DataView[] | undefined>;
