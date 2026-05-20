import type { SavedObjectsType } from '@kbn/core/server';
import { type TypeOf } from '@kbn/config-schema';
export declare const streamsPromptsSOType = "stream-prompts";
export declare const streamsPromptsSOAttributesV1: import("@kbn/config-schema").ObjectType<{
    featurePromptOverride: import("@kbn/config-schema").Type<string | undefined>;
    significantEventsPromptOverride: import("@kbn/config-schema").Type<string | undefined>;
}>;
export declare const streamsPromptsSOAttributesV2: import("@kbn/config-schema").ObjectType<Omit<{
    featurePromptOverride: import("@kbn/config-schema").Type<string | undefined>;
    significantEventsPromptOverride: import("@kbn/config-schema").Type<string | undefined>;
}, "descriptionPromptOverride"> & {
    descriptionPromptOverride: import("@kbn/config-schema").Type<string | undefined>;
}>;
export declare const streamsPromptsSOAttributesV3: import("@kbn/config-schema").ObjectType<Omit<Omit<{
    featurePromptOverride: import("@kbn/config-schema").Type<string | undefined>;
    significantEventsPromptOverride: import("@kbn/config-schema").Type<string | undefined>;
}, "descriptionPromptOverride"> & {
    descriptionPromptOverride: import("@kbn/config-schema").Type<string | undefined>;
}, "systemsPromptOverride"> & {
    systemsPromptOverride: import("@kbn/config-schema").Type<string | undefined>;
}>;
export type PromptsConfigAttributes = TypeOf<typeof streamsPromptsSOAttributesV3>;
export declare const getStreamsPromptsSavedObject: () => SavedObjectsType;
