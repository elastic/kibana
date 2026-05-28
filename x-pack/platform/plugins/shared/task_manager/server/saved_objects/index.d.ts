import type { SavedObjectsServiceSetup } from '@kbn/core/server';
export { scheduleRruleSchemaV1, scheduleRruleSchemaV2, scheduleRruleSchemaV3, } from './schemas/rrule';
export declare const TASK_SO_NAME = "task";
export declare const BACKGROUND_TASK_NODE_SO_NAME = "background-task-node";
export declare const INVALIDATE_API_KEY_SO_NAME = "api_key_to_invalidate";
export declare function setupSavedObjects(savedObjects: SavedObjectsServiceSetup): void;
