import type { GeneralDatasourceStates, DatatableVisualizationState } from '@kbn/lens-common';
import type { ColumnState } from '../../../../../common/expressions';
import type { DeprecatedColorMappingConfig } from '../../../../runtime_state/converters/raw_color_mappings';
/** @deprecated */
interface DeprecatedColorMappingColumn extends Omit<ColumnState, 'colorMapping'> {
    colorMapping: DeprecatedColorMappingConfig;
}
/**
 * Old color mapping state meant for type safety during runtime migrations of old configurations
 *
 * @deprecated Use respective vis state (i.e. `DatatableVisualizationState`)
 */
export interface DeprecatedColorMappingsState extends Omit<DatatableVisualizationState, 'columns'> {
    columns: Array<DeprecatedColorMappingColumn | ColumnState>;
}
export declare const convertToRawColorMappingsFn: (datasourceStates?: Readonly<GeneralDatasourceStates>) => (state: DeprecatedColorMappingsState | DatatableVisualizationState) => DatatableVisualizationState;
export {};
