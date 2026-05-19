import { type ProductName } from './product';
import { type ResourceType, ResourceTypes } from './resource_type';
export declare const DEFAULT_ELSER = ".elser-2-elasticsearch";
export declare const getArtifactName: ({ productName, productVersion, excludeExtension, inferenceId, }: {
    productName: ProductName;
    productVersion: string;
    excludeExtension?: boolean;
    inferenceId?: string;
}) => string;
export declare const parseArtifactName: (artifactName: string) => {
    inferenceId?: string | undefined;
    productName: "kibana" | "security" | "elasticsearch" | "observability";
    productVersion: string;
} | undefined;
/**
 * Generates the artifact name for Security Labs content.
 * Format: security-labs-{version}[--{inferenceId}].zip
 * Version uses date format: YYYY.MM.DD
 */
export declare const getSecurityLabsArtifactName: ({ version, excludeExtension, inferenceId, }: {
    version: string;
    excludeExtension?: boolean;
    inferenceId?: string;
}) => string;
/**
 * Parses a Security Labs artifact name to extract version and optional inference ID.
 */
export declare const parseSecurityLabsArtifactName: (artifactName: string) => {
    version: string;
    inferenceId?: string;
    resourceType: typeof ResourceTypes.securityLabs;
} | undefined;
/**
 * Determines the resource type from an artifact name.
 */
export declare const getResourceTypeFromArtifactName: (artifactName: string) => ResourceType | undefined;
/**
 * Validates a Security Labs version string (YYYY.MM.DD format).
 */
export declare const isValidSecurityLabsVersion: (version: string) => boolean;
