import type { GeneralDatasourceStates } from '@kbn/lens-common';
import { convertToLegendStats } from './legend_stats';
export declare const getRuntimeConverters: (datasourceStates?: Readonly<GeneralDatasourceStates>) => (typeof convertToLegendStats)[];
