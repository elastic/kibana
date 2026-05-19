import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import type { NewPackagePolicy, UpdatePackagePolicy } from '../../../common';
import type { PackageInfo, PackagePolicy, SecretReference, SecretPath } from '../../types';
/**
 * Given a new package policy, extracts any secrets, creates them in Elasticsearch,
 * and returns a new package policy with secret references in place of the
 * original secret values, along with an array of secret references for
 * storage on the package policy object itself.
 */
export declare function extractAndWriteSecrets(opts: {
    packagePolicy: NewPackagePolicy;
    packageInfo: PackageInfo;
    esClient: ElasticsearchClient;
}): Promise<{
    packagePolicy: NewPackagePolicy;
    secretReferences: SecretReference[];
}>;
/**
 * Given a package policy update, extracts any secrets, creates them in Elasticsearch,
 * and returns a package policy update with secret references in place of the
 * original secret values, along with an array of secret references for
 * storage on the package policy object itself.
 */
export declare function extractAndUpdateSecrets(opts: {
    oldPackagePolicy: PackagePolicy;
    packagePolicyUpdate: UpdatePackagePolicy;
    packageInfo: PackageInfo;
    esClient: ElasticsearchClient;
}): Promise<{
    packagePolicyUpdate: UpdatePackagePolicy;
    secretReferences: SecretReference[];
    secretsToDelete: SecretReference[];
}>;
/**
 * Given a list of secret ids, checks to see if they are still referenced by any
 * package policies, and if not, deletes them.
 */
export declare function deleteSecretsIfNotReferenced(opts: {
    esClient: ElasticsearchClient;
    soClient: SavedObjectsClientContract;
    ids: string[];
}): Promise<void>;
export declare function findPackagePoliciesUsingSecrets(opts: {
    soClient: SavedObjectsClientContract;
    ids: string[];
}): Promise<Array<{
    id: string;
    policyIds: string[];
}>>;
export declare function diffSecretPaths(oldPaths: SecretPath[], newPaths: SecretPath[]): {
    toCreate: SecretPath[];
    toDelete: SecretPath[];
    noChange: SecretPath[];
};
/**
 * Given a package policy and a package,
 * returns an array of lodash style paths to all secrets and their current values.
 */
export declare function getPolicySecretPaths(packagePolicy: PackagePolicy | NewPackagePolicy | UpdatePackagePolicy, packageInfo: PackageInfo): SecretPath[];
