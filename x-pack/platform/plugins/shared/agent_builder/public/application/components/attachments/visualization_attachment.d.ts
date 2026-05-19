import type { VisualizationAttachment } from '@kbn/agent-builder-common/attachments';
import { type AttachmentUIDefinition } from '@kbn/agent-builder-browser/attachments';
import type { AgentBuilderStartDependencies } from '../../../types';
/**
 * Factory function that creates the visualization attachment UI definition.
 * Reuses the existing VisualizeLens component used for visualization tool results.
 */
export declare const createVisualizationAttachmentDefinition: ({ startDependencies, }: {
    startDependencies: AgentBuilderStartDependencies;
}) => AttachmentUIDefinition<VisualizationAttachment>;
