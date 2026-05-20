import type { Filter } from '@kbn/es-query';
import type { MigrateFunction } from '@kbn/kibana-utils-plugin/common';
import type { StoredMapAttributes } from '../../server';
export declare function migrateDataPersistedState({ attributes, }: {
    attributes: StoredMapAttributes;
}, filterMigration: MigrateFunction<Filter[], Filter[]>): StoredMapAttributes;
