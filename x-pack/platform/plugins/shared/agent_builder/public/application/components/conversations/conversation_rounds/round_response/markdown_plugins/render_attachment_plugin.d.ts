import React from 'react';
import type { VersionedAttachment, AttachmentVersionRef } from '@kbn/agent-builder-common/attachments';
import { type RenderAttachmentElementAttributes } from '@kbn/agent-builder-common/tools/custom_rendering';
import type { AttachmentsService } from '../../../../../../services';
interface ResolveAttachmentVersionParams {
    explicitVersion: string | number | undefined;
    attachmentId: string;
    attachmentRefs: AttachmentVersionRef[] | undefined;
    attachment: VersionedAttachment;
}
/**
 * Resolves the version to use for an attachment.
 * Priority:
 * 1. Explicit version from tag attributes
 * 2. Version from cumulative attachment refs (highest version seen up to this round)
 * 3. Latest available version as fallback
 */
export declare const resolveAttachmentVersion: ({ explicitVersion, attachmentId, attachmentRefs, attachment, }: ResolveAttachmentVersionParams) => number | undefined;
/**
 * Parser for <render_attachment> tags in markdown.
 * Converts HTML/text nodes containing render_attachment tags into structured AST nodes.
 */
export declare const renderAttachmentTagParser: () => (tree: import("unist").Node) => void;
interface RenderAttachmentRendererProps {
    attachmentsService: AttachmentsService;
    conversationAttachments?: VersionedAttachment[];
    attachmentRefs?: AttachmentVersionRef[];
    conversationId?: string;
    isSidebar: boolean;
}
/**
 * Creates a renderer for <render_attachment> tags.
 */
export declare const createRenderAttachmentRenderer: ({ attachmentsService, conversationAttachments, attachmentRefs, conversationId, isSidebar, }: RenderAttachmentRendererProps) => (props: RenderAttachmentElementAttributes) => React.JSX.Element | null;
export {};
