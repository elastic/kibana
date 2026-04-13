import type { FlattenRecord } from '@kbn/streams-schema';
import type { StreamRoutingContext } from './types';
import type { RoutingSamplesContext } from './routing_samples_state_machine';
/**
 * Selects the set of dotted fields that are not supported by the current simulation.
 */
export declare const selectCurrentRule: ((state: StreamRoutingContext) => import("../../types").RoutingDefinitionWithUIAttributes) & import("reselect").OutputSelectorFields<(args_0: import("../../types").RoutingDefinitionWithUIAttributes[], args_1: string | null) => import("../../types").RoutingDefinitionWithUIAttributes, {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
/**
 * Selects the documents used for the data preview table.
 */
export declare const selectPreviewDocuments: ((state: RoutingSamplesContext) => FlattenRecord[]) & import("reselect").OutputSelectorFields<(args_0: import("@kbn/streams-schema/src/shared/record_types").RecursiveRecord[]) => FlattenRecord[], {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
/**
 * Selects whether routing has changes compared to initial routing.
 */
export declare const selectHasRoutingChanges: ((state: StreamRoutingContext) => boolean) & import("reselect").OutputSelectorFields<(args_0: import("../../types").RoutingDefinitionWithUIAttributes[], args_1: import("../../types").RoutingDefinitionWithUIAttributes[]) => boolean, {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
