import type { ProcessorInternal, ProcessorSelector } from '../types';
export declare const buildMoveAnnouncement: ({ source, destination, processors, onFailureProcessors, }: {
    source: ProcessorSelector;
    destination: ProcessorSelector;
    processors: ProcessorInternal[];
    onFailureProcessors: ProcessorInternal[];
}) => {
    movedProcessorId: string;
    announcement: string;
} | undefined;
export declare const restoreMovedProcessorFocus: ({ movedProcessorId, maxFrames, onDone, }: {
    movedProcessorId: string;
    maxFrames?: number;
    onDone: (result: {
        didFocus: boolean;
    }) => void;
}) => () => void;
interface RefLike<T> {
    current: T;
}
export declare const applyPendingMoveA11yEffects: ({ modeId, pendingFocusProcessorIdRef, pendingMoveAnnouncementRef, setMoveAnnouncement, }: {
    modeId: string;
    pendingFocusProcessorIdRef: RefLike<string | null>;
    pendingMoveAnnouncementRef: RefLike<string | null>;
    setMoveAnnouncement: (next: string) => void;
}) => void | (() => void);
export {};
