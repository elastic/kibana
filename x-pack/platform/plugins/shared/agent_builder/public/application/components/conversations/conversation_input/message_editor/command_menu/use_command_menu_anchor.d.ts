import type { CommandMatchResult, AnchorPosition } from './types';
interface UseCommandMenuAnchorOptions {
    readonly commandMatch: CommandMatchResult;
    readonly editorRef: React.RefObject<HTMLDivElement>;
    readonly containerRef: React.RefObject<HTMLDivElement>;
}
/**
 * Computes the popover anchor position from the active command's character
 * offset. Retains the last known position when the command becomes inactive
 * so the popover can animate closed in place.
 */
export declare const useCommandMenuAnchor: ({ commandMatch, editorRef, containerRef, }: UseCommandMenuAnchorOptions) => AnchorPosition | null;
export {};
