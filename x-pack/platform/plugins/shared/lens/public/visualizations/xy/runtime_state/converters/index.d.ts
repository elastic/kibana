import type { GeneralDatasourceStates } from '@kbn/lens-common';
import type { convertXYToLegendStats } from '../../../../../common/content_management/v1/transforms/legend_stats/xy';
export declare const getRuntimeConverters: (datasourceStates?: Readonly<GeneralDatasourceStates>) => (typeof convertXYToLegendStats)[];
