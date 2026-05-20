import type { ActiveCommand } from './command_menu';
/**
 * Browsers cannot place a caret before a non-editable element (`contentEditable="false"`)
 * that is the first child of a contentEditable container.
 * A zero-width space provides an invisible caret target without affecting layout.
 */
export declare const ZERO_WIDTH_SPACE = "\u200B";
/**
 * Converts a plain text string into a DocumentFragment, preserving line breaks
 * as <br> elements. Text nodes alone cannot render \n in a contenteditable div.
 */
export declare const createTextFragment: (text: string) => DocumentFragment;
/**
 * Creates a DOM Range spanning the full command text (sequence + query)
 * within the editor, e.g. the range covering "/summ" in "hello /summ".
 */
export declare const createCommandRange: (messageEditorElement: HTMLElement, activeCommand: ActiveCommand) => Range;
/**
 * Inserts a non-breaking space text node immediately after `node` within `container`.
 * Uses NBSP (\u00A0) because browsers collapse trailing regular spaces in contenteditable.
 */
export declare const insertSpaceAfter: (node: Node, container: HTMLElement) => Text;
/**
 * Collapses the selection to a cursor position immediately after `node`.
 */
export declare const placeCursorAfter: (node: Node, sel: Selection) => void;
export declare const placeCursorAtEnd: (editorElement: HTMLDivElement) => void;
/**
 * Returns the current selection's first Range, or undefined if there is no selection.
 */
export declare const getSelectionRange: () => Range | undefined;
/**
 * Replaces the current selection with `node` and places the cursor after it.
 * Used by paste handling to insert content at the caret position.
 */
export declare const insertNodeAtCursor: (node: Node) => void;
/**
 * Ensures the browser can place a caret before the first child when it is a
 * non-editable command badge. Inserts a zero-width space text node if needed.
 *
 * Also cleans up browser-inserted artifacts (`<br>`, empty text nodes) that
 * appear before a leading badge after the user deletes text — browsers add
 * these to preserve cursor position in contentEditable.
 *
 * @returns `true` if the DOM was modified (callers may need to restore cursor position).
 */
export declare const ensureCaretTargetBeforeFirstBadge: (container: HTMLElement) => boolean;
/**
 * Strips zero-width space characters used as caret targets.
 */
export declare const stripZeroWidthSpaces: (text: string) => string;
