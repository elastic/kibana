/**
 * Tracks whether an element matching the given CSS selector is currently mounted in the DOM.
 * Used to guard tour steps anchored by `data-test-subj` so a popover only renders once its
 * anchor exists (e.g. after the app header menu or a lazily-rendered panel has mounted).
 */
export declare const useIsAnchorMounted: (selector: string) => boolean;
