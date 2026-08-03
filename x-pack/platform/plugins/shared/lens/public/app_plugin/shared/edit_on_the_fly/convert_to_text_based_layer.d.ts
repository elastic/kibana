import type { TypedLensSerializedState } from '@kbn/lens-common';
import type { ConvertToEsqlParams } from './esql_conversion_types';
/**
 * Converts form-based layers to text-based (ES|QL) and returns new attributes.
 * Returns undefined if conversion fails or no layers to convert.
 */
export declare function convertFormBasedToTextBasedLayer({ layersToConvert, attributes, visualizationState, datasourceStates, framePublicAPI, }: ConvertToEsqlParams): TypedLensSerializedState['attributes'] | undefined;
