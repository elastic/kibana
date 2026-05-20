import type { ProcessorType } from '../../types/processors';
export interface ActionExample {
    description: string;
    yaml: string;
}
export interface ActionMetadata {
    name: string;
    description: string;
    usage: string;
    examples: ActionExample[];
    tips?: string[];
}
/**
 * Metadata for all processor actions. This map is strongly typed to ensure
 * every ProcessorType has a corresponding entry.
 */
export declare const ACTION_METADATA_MAP: Record<ProcessorType, ActionMetadata>;
