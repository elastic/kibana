import type { UnifiedAttachmentTypeRegistry } from '../../client/attachment_framework/unified_attachment_registry';
export interface RegisterInternalAttachmentsOptions {
    hasDashboardPluginEnabled?: boolean;
    hasMapsPluginEnabled?: boolean;
}
export declare const registerInternalAttachments: (unifiedRegistry: UnifiedAttachmentTypeRegistry, { hasDashboardPluginEnabled, hasMapsPluginEnabled, }?: RegisterInternalAttachmentsOptions) => void;
