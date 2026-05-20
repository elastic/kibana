import type { Processor } from '../../../../common/types';
import type { ProcessorInternal, VerboseTestOutput, ProcessorResult } from './types';
export interface DeserializeArgs {
    processors: Processor[];
    onFailure?: Processor[];
}
export interface DeserializeResult {
    processors: ProcessorInternal[];
    onFailure?: ProcessorInternal[];
}
export declare const deserialize: ({ processors, onFailure }: DeserializeArgs) => DeserializeResult;
export interface DeserializedProcessorResult {
    [key: string]: ProcessorResult;
}
/**
 * This function takes the verbose response of the simulate API
 * and maps the results to each processor in the pipeline by the "tag" field
 */
export declare const deserializeVerboseTestOutput: (output: VerboseTestOutput) => DeserializedProcessorResult[];
