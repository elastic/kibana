import type { CommandMatchResult } from './types';
interface CommandMenuState {
    /** Current command match result */
    readonly match: CommandMatchResult;
    /** Dismiss the current command (e.g., user presses Escape) */
    readonly dismiss: () => void;
    /** Handler to be called on input events */
    readonly checkInputForCommand: (element: HTMLElement) => void;
    /** Reports whether the active command's mounted menu has anything to show, for a given query */
    readonly reportContent: (hasVisibleContent: boolean, forQuery: string) => void;
}
interface UseCommandMenuOptions {
    /** Whether command detection is enabled. Defaults to true. */
    readonly enabled?: boolean;
}
/**
 * Hook that detects command sequences in a contentEditable element.
 *
 * Used internally by useMessageEditor to track command state as the
 * user types. Check `match.isActive` to show/hide the command menu.
 */
export declare const useCommandMenu: (options?: UseCommandMenuOptions) => CommandMenuState;
export {};
