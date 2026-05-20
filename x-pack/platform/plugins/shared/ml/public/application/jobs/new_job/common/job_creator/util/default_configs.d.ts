import { type Field, type Aggregation } from '@kbn/ml-anomaly-utils';
import type { IndexPatternTitle } from '@kbn/ml-common-types/kibana';
import type { Datafeed } from '@kbn/ml-common-types/anomaly_detection_jobs/datafeed';
import type { Job } from '@kbn/ml-common-types/anomaly_detection_jobs/job';
export declare function createEmptyJob(): Job;
export declare function createEmptyDatafeed(indexPatternTitle: IndexPatternTitle): Datafeed;
export declare function createBasicDetector(agg: Aggregation, field: Field): import("@elastic/elasticsearch/lib/api/types").MlDetector;
