import type { GeneralDatasourceStates } from '@kbn/lens-common';
export declare const getRuntimeConverters: (datasourceStates?: Readonly<GeneralDatasourceStates>) => ((state: import("./raw_color_mappings").DeprecatedColorMappingsState | import("@kbn/lens-common").DatatableVisualizationState) => import("@kbn/lens-common").DatatableVisualizationState)[];
