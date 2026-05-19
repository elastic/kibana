import type { GeneralDatasourceStates } from '@kbn/lens-common';
export declare const getRuntimeConverters: (datasourceStates?: Readonly<GeneralDatasourceStates>) => ((state: import("./raw_color_mappings").DeprecatedColorMappingTagcloudState | import("../../types").TagcloudState) => import("../../types").TagcloudState)[];
