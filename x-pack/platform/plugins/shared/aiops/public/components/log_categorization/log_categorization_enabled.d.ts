import type { ApplicationStart } from '@kbn/core/public';
import type { DataView } from '@kbn/data-views-plugin/public';
export declare function getPatternAnalysisAvailable(application: ApplicationStart): (dataView: DataView) => boolean;
