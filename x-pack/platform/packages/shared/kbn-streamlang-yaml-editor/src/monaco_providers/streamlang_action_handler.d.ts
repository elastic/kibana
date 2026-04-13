import type { monaco } from '@kbn/monaco';
import { type ActionMetadata } from '@kbn/streamlang';
import type { ActionHoverContext } from './provider_interfaces';
export declare class StreamlangActionHandler {
    private readonly metadataMap;
    constructor(metadataMap?: Record<string, ActionMetadata>);
    canHandle(actionType: string): boolean;
    generateHoverContent(context: ActionHoverContext): Promise<monaco.IMarkdownString | null>;
    private buildHoverMarkdown;
    private createMarkdownContent;
}
