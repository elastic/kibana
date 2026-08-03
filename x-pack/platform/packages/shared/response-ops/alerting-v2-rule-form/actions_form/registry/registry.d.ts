import type { InlineActionStepType } from '../types';
import type { InlineActionStepDefinition } from './types';
export declare const INLINE_ACTION_STEP_DEFINITIONS: readonly InlineActionStepDefinition[];
export declare const getInlineActionStepDefinition: (id: InlineActionStepType) => InlineActionStepDefinition | undefined;
export declare const getDefaultInlineActionStepDefinition: () => InlineActionStepDefinition;
