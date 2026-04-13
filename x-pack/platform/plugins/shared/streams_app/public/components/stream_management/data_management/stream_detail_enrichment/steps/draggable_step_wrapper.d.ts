import React, { type ReactNode } from 'react';
import type { InteractiveModeContext } from '../state_management/interactive_mode_machine';
interface DraggableStepWrapperProps {
    stepId: string;
    index: number;
    level: number;
    children: ReactNode;
    stepRefs: InteractiveModeContext['stepRefs'];
    isBlocked?: boolean;
    hasChildren?: boolean;
    isDragEnabled?: boolean;
}
export declare const useDragHandle: () => React.RefObject<HTMLSpanElement> | null;
export declare const DragHandle: () => React.JSX.Element | null;
export declare const DraggableStepWrapper: ({ stepId, index, level, children, stepRefs, isBlocked, hasChildren, isDragEnabled, }: DraggableStepWrapperProps) => React.JSX.Element;
export {};
