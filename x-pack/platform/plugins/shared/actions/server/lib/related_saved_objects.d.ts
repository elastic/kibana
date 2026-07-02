import type { TypeOf } from '@kbn/config-schema';
import type { Logger } from '@kbn/core/server';
export type RelatedSavedObjects = TypeOf<typeof RelatedSavedObjectsSchema>;
declare const RelatedSavedObjectsSchema: import("@kbn/config-schema").Type<Readonly<{
    namespace?: string | undefined;
    typeId?: string | undefined;
} & {
    id: string;
    type: string;
}>[]>;
export declare function validatedRelatedSavedObjects(logger: Logger, data: unknown): RelatedSavedObjects;
export {};
