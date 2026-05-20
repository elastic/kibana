import type { MlSavedObjectType } from '@kbn/ml-common-types/saved_objects';
type MemoryItem = MlSavedObjectType | 'jvm-heap-size' | 'estimated-available-memory';
export declare function getMemoryItemColor(typeIn: MemoryItem): string;
export {};
