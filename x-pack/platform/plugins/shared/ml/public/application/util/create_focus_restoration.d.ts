/**
 * Creates a function that restores focus to a trigger element after a delay.
 * Useful for modals that need time to close before focusing.
 * @param triggerElement - The element to focus when the function is called
 * @param delay - Delay in milliseconds before attempting to focus (default: 0)
 * @returns A function that restores focus to the trigger element
 */
export declare const createFocusRestoration: (triggerElement: HTMLElement | null | undefined, delay?: number) => (() => void);
export declare const createJobActionFocusRestoration: (jobId: string) => () => void;
