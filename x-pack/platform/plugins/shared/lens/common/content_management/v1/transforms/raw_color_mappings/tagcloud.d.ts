import type { GeneralDatasourceStates } from '@kbn/lens-common';
import type { TagcloudState } from '../../../../../public';
import { type DeprecatedColorMappingConfig } from './common';
/**
 * Old color mapping state meant for type safety during runtime migrations of old configurations
 *
 * @deprecated
 */
export interface DeprecatedColorMappingTagcloudState extends Omit<TagcloudState, 'colorMapping'> {
    colorMapping: DeprecatedColorMappingConfig;
}
export declare const convertTagcloudToRawColorMappings: (state: TagcloudState | DeprecatedColorMappingTagcloudState, datasourceStates?: Readonly<GeneralDatasourceStates>) => TagcloudState;
