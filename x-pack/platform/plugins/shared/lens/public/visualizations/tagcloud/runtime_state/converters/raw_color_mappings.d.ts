import type { GeneralDatasourceStates } from '@kbn/lens-common';
import type { DeprecatedColorMappingConfig } from '../../../../runtime_state/converters/raw_color_mappings';
import type { TagcloudState } from '../../types';
/**
 * Old color mapping state meant for type safety during runtime migrations of old configurations
 *
 * @deprecated
 */
export interface DeprecatedColorMappingTagcloudState extends Omit<TagcloudState, 'colorMapping'> {
    colorMapping: DeprecatedColorMappingConfig;
}
export declare const convertToRawColorMappingsFn: (datasourceStates?: Readonly<GeneralDatasourceStates>) => (state: DeprecatedColorMappingTagcloudState | TagcloudState) => TagcloudState;
