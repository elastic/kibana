import React from 'react';
import type { RenderersService, ConversationsService } from '../../../../../../services';
/**
 * Parser for <render> tags in markdown.
 * Converts HTML/text nodes containing render tags into structured AST nodes
 * carrying the workspace `path` and renderer `type`.
 */
export declare const renderTagParser: () => (tree: import("unist").Node) => void;
interface RenderRendererDeps {
    renderersService: RenderersService;
    conversationsService: ConversationsService;
    conversationId?: string;
    isStreaming: boolean;
}
/** Props derived from the `render` AST node (see `createNode` above). */
interface RenderNodeProps {
    path?: string;
    renderType?: string;
}
/**
 * Factory for the `<render>` renderer, mirroring `createRenderAttachmentRenderer`.
 */
export declare const createRenderRenderer: ({ renderersService, conversationsService, conversationId, isStreaming, }: RenderRendererDeps) => (props: RenderNodeProps) => React.JSX.Element | null;
export {};
