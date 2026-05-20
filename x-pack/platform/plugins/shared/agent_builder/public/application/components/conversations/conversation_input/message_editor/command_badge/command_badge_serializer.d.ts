import type { CommandBadgeData } from './types';
interface TextSegment {
    type: 'text';
    value: string;
}
interface BadgeSegment {
    type: 'badge';
    data: CommandBadgeData;
}
export type ContentSegment = TextSegment | BadgeSegment;
export declare class CommandBadgeSerializationError extends Error {
    constructor(message: string, options?: ErrorOptions);
}
export declare const serializeCommandBadge: (element: HTMLElement) => string;
/**
 * Parses text containing serialized badge markdown-links into segments.
 * Used to restore badges from serialized content.
 */
export declare const deserializeCommandBadge: (text: string) => ContentSegment[];
export {};
