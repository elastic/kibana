import { type CoreSetup } from '@kbn/core/server';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { ElasticsearchClient } from '@kbn/core/server';
export declare function getInternalClients(core: CoreSetup): Promise<[SavedObjectsClientContract, ElasticsearchClient]>;
