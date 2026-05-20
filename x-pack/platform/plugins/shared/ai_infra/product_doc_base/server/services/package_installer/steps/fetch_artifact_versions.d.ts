import { type ProductName } from '@kbn/product-doc-common';
type ArtifactAvailableVersions = Record<ProductName | 'openapi', string[]>;
export declare const fetchArtifactVersions: ({ artifactRepositoryUrl, artifactRepositoryProxyUrl, }: {
    artifactRepositoryUrl: string;
    artifactRepositoryProxyUrl?: string;
}) => Promise<ArtifactAvailableVersions>;
/**
 * Fetches available Security Labs artifact versions from the repository.
 */
export declare const fetchSecurityLabsVersions: ({ artifactRepositoryUrl, artifactRepositoryProxyUrl, }: {
    artifactRepositoryUrl: string;
    artifactRepositoryProxyUrl?: string;
}) => Promise<string[]>;
export {};
