import type { Processor } from '../../../../common/types';
import type { ProcessorInternal } from './types';
interface SerializeArgs {
    /**
     * The deserialized pipeline to convert
     */
    pipeline: {
        processors: ProcessorInternal[];
        onFailure?: ProcessorInternal[];
    };
    /**
     * For simulation, we add the "tag" field equal to the internal processor id so that we can map the simulate results to each processor
     */
    copyIdToTag?: boolean;
}
export interface SerializeResult {
    processors: Processor[];
    on_failure?: Processor[];
}
export declare const serialize: ({ pipeline: { processors, onFailure }, copyIdToTag, }: SerializeArgs) => SerializeResult;
export {};
