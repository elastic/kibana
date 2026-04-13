import { type Instruction } from '@atlaskit/pragmatic-drag-and-drop-hitbox/list-item';
import type { InteractiveModeContext } from '../state_management/interactive_mode_machine';
interface DragDropMonitorProps {
    stepRefs: InteractiveModeContext['stepRefs'];
    onReorder: (params: {
        sourceStepId: string;
        targetStepId: string;
        instruction: Instruction;
    }) => void;
}
export declare const DragDropMonitor: ({ stepRefs, onReorder }: DragDropMonitorProps) => null;
export {};
