import type { StreamlangProcessorDefinition } from './processors';
import type { ConditionWithSteps, StreamlangConditionBlock } from './streamlang';
/** Which branch of a parent condition block a step belongs to: main (if) vs else. */
export type StreamlangUIBranch = 'if' | 'else';
export interface UIAttributes {
    parentId: string | null;
    customIdentifier: string;
    branch?: StreamlangUIBranch;
}
export type StreamlangProcessorDefinitionWithUIAttributes = StreamlangProcessorDefinition & UIAttributes;
export type StreamlangConditionWithoutSteps = Omit<ConditionWithSteps, 'steps' | 'else'>;
export type StreamlangConditionBlockWithUIAttributes = Omit<StreamlangConditionBlock, 'condition'> & {
    condition: StreamlangConditionWithoutSteps;
} & UIAttributes;
export type StreamlangStepWithUIAttributes = StreamlangProcessorDefinitionWithUIAttributes | StreamlangConditionBlockWithUIAttributes;
