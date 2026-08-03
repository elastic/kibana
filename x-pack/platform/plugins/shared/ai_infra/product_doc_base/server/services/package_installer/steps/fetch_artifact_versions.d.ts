import { type ProductName } from '@kbn/product-doc-common';
type ArtifactAvailableVersions = Record<ProductName | 'openapi', string[]>;
export declare const fetchArtifactVersions: ({ artifactRepositoryUrl, artifactRepositoryProxyUrl, }: {
    artifactRepositoryUrl: string;
    artifactRepositoryProxyUrl?: string;
}) => Promise<ArtifactAvailableVersions>;
/**
 * Fetches available Security Labs artifact versions for a specific inference ID.
 *
 * Only versions whose exact downloadable filename matches
 * `getSecurityLabsArtifactName({ version, inferenceId })` are returned, so a newer
 * Jina-only publish cannot poison ELSER "latest" selection (and vice versa).
 */
export declare const fetchSecurityLabsVersions: ({ artifactRepositoryUrl, artifactRepositoryProxyUrl, inferenceId, }: {
    artifactRepositoryUrl: string;
    artifactRepositoryProxyUrl?: string;
    inferenceId: string;
}) => Promise<string[]>;
export {};
