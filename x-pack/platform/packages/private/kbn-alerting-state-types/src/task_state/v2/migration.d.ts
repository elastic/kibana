import { type TypeOf } from '@kbn/config-schema';
import type { versionSchema } from './schema';
type VersionSchema = TypeOf<typeof versionSchema>;
export declare const upMigration: (state: Record<string, unknown>) => VersionSchema;
export {};
