import type { Capabilities } from '@kbn/core/types';
/**
 * Represent the UI capabilities for the `savedObjectsTagging` section of `Capabilities`
 */
export interface TagsCapabilities {
    view: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;
    assign: boolean;
    viewConnections: boolean;
}
export declare const getTagsCapabilities: (capabilities: Capabilities) => TagsCapabilities;
