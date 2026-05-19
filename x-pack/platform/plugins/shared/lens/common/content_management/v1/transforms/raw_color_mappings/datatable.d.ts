import type { GeneralDatasourceStates } from '@kbn/lens-common';
import type { DatatableVisualizationState } from '../../../../../public';
import type { ColumnState } from '../../../../expressions';
import { type DeprecatedColorMappingConfig } from './common';
/** @deprecated */
interface DeprecatedColorMappingColumn extends Omit<ColumnState, 'colorMapping'> {
    colorMapping: DeprecatedColorMappingConfig;
}
/**
 * Old color mapping state meant for type safety during runtime migrations of old configurations
 *
 * @deprecated Use respective vis state (i.e. `DatatableVisualizationState`)
 */
export interface DeprecatedColorMappingsDatatableState extends Omit<DatatableVisualizationState, 'columns'> {
    columns: Array<ColumnState | DeprecatedColorMappingColumn>;
}
export declare const convertDatatableToRawColorMappings: (state: DatatableVisualizationState | DeprecatedColorMappingsDatatableState, datasourceStates?: Readonly<GeneralDatasourceStates>) => DatatableVisualizationState;
export {};
