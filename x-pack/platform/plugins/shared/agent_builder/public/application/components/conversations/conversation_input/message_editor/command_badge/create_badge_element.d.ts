import type { CommandBadgeData } from './types';
/**
 * Creates a non-editable badge span element with embedded metadata.
 */
export declare const createCommandBadgeElement: (data: CommandBadgeData) => HTMLSpanElement;
export declare const isElementCommandBadge: (element: HTMLElement) => boolean;
