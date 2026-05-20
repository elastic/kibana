import type { CombinedJob } from '@kbn/ml-common-types/anomaly_detection_jobs/combined_job';
import type { Entity } from './components/entity_control/entity_control';
import type { MlEntity } from '../../embeddables';
/**
 * Extracts entities from the detector configuration
 */
export declare function getControlsForDetector(selectedDetectorIndex: number, selectedEntities: MlEntity | undefined, selectedJob: CombinedJob): Entity[];
