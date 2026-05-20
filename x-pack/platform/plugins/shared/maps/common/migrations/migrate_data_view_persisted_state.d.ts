import type { Serializable } from '@kbn/utility-types';
import type { MigrateFunction } from '@kbn/kibana-utils-plugin/common';
import type { StoredMapAttributes } from '../../server';
export declare function migrateDataViewsPersistedState({ attributes, }: {
    attributes: StoredMapAttributes;
}, migration: MigrateFunction<Serializable, Serializable>): StoredMapAttributes;
