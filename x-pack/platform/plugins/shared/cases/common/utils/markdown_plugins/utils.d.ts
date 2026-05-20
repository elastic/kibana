import type { Node } from 'unist';
import type { SerializableRecord } from '@kbn/utility-types';
import type { TimeRange } from '@kbn/es-query';
export interface LensMarkdownNode extends Node {
    timeRange: TimeRange;
    attributes: SerializableRecord;
    type: string;
    id: string;
}
/**
 * A node that has children of other nodes describing the markdown elements or a specific lens visualization.
 */
export interface MarkdownNode extends Node {
    children: Array<LensMarkdownNode | Node>;
}
export declare const getLensVisualizations: (parsedComment?: Array<LensMarkdownNode | Node>) => LensMarkdownNode[];
/**
 * Converts a text comment into a series of markdown nodes that represent a lens visualization, a timeline link, or just
 * plain markdown.
 */
export declare const parseCommentString: (comment: string) => MarkdownNode;
export declare const stringifyMarkdownComment: (comment: MarkdownNode) => string;
export declare const isLensMarkdownNode: (node?: unknown) => node is LensMarkdownNode;
