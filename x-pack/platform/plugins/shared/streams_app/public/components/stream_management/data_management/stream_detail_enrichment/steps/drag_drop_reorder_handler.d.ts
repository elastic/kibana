import type { Instruction } from '@atlaskit/pragmatic-drag-and-drop-hitbox/list-item';
import type { InteractiveModeContext } from '../state_management/interactive_mode_machine';
/**
 * Handles drag-drop reorder by converting Atlassian's drag-drop instructions
 * into the state machine's reorder event format. Supports moving items between
 * different parent levels and nesting items inside condition blocks.
 */
export declare function handleDragDropReorder(params: {
    sourceStepId: string;
    targetStepId: string;
    instruction: Instruction;
    stepRefs: InteractiveModeContext['stepRefs'];
    reorderByDragDropFn: (sourceStepId: string, targetStepId: string, operation: 'before' | 'after' | 'inside') => void;
}): void;
