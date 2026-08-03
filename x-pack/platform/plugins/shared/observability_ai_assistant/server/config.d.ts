import { type TypeOf } from '@kbn/config-schema';
export declare const config: import("@kbn/config-schema").ObjectType<{
    enabled: import("@kbn/config-schema").Type<boolean>;
    scope: import("@kbn/config-schema").Type<"search" | "observability" | undefined>;
    enableKnowledgeBase: import("@kbn/config-schema").Type<boolean>;
    disableKbSemanticTextMigration: import("@kbn/config-schema").Type<boolean>;
}>;
export type ObservabilityAIAssistantConfig = TypeOf<typeof config>;
