/**
 * Returns a DOMRect for a character offset within a contentEditable element.
 * Walks text nodes via TreeWalker to find the correct node and offset,
 * then uses a collapsed Range to get the bounding rect.
 */
export declare const getRectAtOffset: (element: HTMLElement, offset: number) => DOMRect | null;
