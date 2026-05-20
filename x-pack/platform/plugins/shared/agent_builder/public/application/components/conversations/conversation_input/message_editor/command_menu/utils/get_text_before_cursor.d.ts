/**
 * Extracts the text before the cursor from a contentEditable element.
 *
 * Command sequences inside badge elements are replaced with spaces so
 * they are not picked up by command matching logic, while preserving the
 * text length for correct character offset calculations.
 */
export declare const getTextBeforeCursor: (element: HTMLElement) => string;
