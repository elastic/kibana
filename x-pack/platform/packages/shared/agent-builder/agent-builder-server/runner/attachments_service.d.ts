import type { AttachmentBoundedTool, AttachmentTypeDefinition } from '../attachments';
import type { ExecutableTool } from './tool_provider';
/**
 * Service to access attachment types definitions.
 */
export interface AttachmentsService {
    /**
     * Returns the full definition for an attachment type
     */
    getTypeDefinition(type: string): AttachmentTypeDefinition | undefined;
    /**
     * Returns the IDs of all registered attachment types.
     */
    getRegisteredTypeIds(): string[];
    /**
     * Convert an attachment-scoped tool to a generic executable tool
     */
    convertAttachmentTool(tool: AttachmentBoundedTool): ExecutableTool;
}
