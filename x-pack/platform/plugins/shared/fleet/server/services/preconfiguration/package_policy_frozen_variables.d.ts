import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import type { PreconfiguredInputs } from '../../../common/types';
import type { PackagePolicy } from '../../types';
export declare function packagePolicyHasFrozenVariablesUpdate(existingPackagePolicy: PackagePolicy, preconfiguredInputs: PreconfiguredInputs[]): boolean;
export declare function updateFrozenInputs(esClient: ElasticsearchClient, soClient: SavedObjectsClientContract, packagePolicy: PackagePolicy, inputs: PreconfiguredInputs[]): Promise<void>;
