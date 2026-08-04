import type { SchemaValue } from '@kbn/core/public';
import type { AssistantScope } from '@kbn/ai-assistant-common';
export interface Scope {
    scopes: AssistantScope[];
}
export declare const scopeSchema: SchemaValue<AssistantScope[]>;
