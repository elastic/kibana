import type { StreamlangProcessorDefinition } from '../../../types/processors';
import type { Condition } from '../../../types/conditions';
import type { StreamlangStep } from '../../../types/streamlang';
/**
 * Flattens Streamlang steps. Nested where blocks are recursively processed,
 * returning a flat array of action blocks with combined conditions.
 */
export declare function flattenSteps(steps: StreamlangStep[], parentCondition?: Condition): StreamlangProcessorDefinition[];
