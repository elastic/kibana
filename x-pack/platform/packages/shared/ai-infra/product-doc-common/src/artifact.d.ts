import { type ProductName } from './product';
import { type ResourceType, ResourceTypes } from './resource_type';
export declare const DEFAULT_ELSER = ".elser-2-elasticsearch";
/**
 * Builds a UTC timestamp version for a new Security Labs artifact publish.
 * Example: `2026.07.10-152831`
 */
export declare const getSecurityLabsUtcTimestampVersion: (date?: Date) => string;
/**
 * Derives the legacy `YYYY.MM.DD` version from a timestamp version.
 *
 * Used to publish a second ELSER CDN object for Kibana 9.3/9.4 BWC — those
 * releases only parse date-only names from
 * https://github.com/elastic/kibana/pull/246099. Returns undefined when
 * `version` is already date-only or not a timestamp version.
 */
export declare const getSecurityLabsLegacyDateVersion: (version: string) => string | undefined;
export declare const getArtifactName: ({ productName, productVersion, excludeExtension, inferenceId, }: {
    productName: ProductName;
    productVersion: string;
    excludeExtension?: boolean;
    inferenceId?: string;
}) => string;
export declare const parseArtifactName: (artifactName: string) => {
    inferenceId?: string | undefined;
    productName: "kibana" | "security" | "observability" | "elasticsearch";
    productVersion: string;
} | undefined;
/**
 * Generates the artifact name for Security Labs content.
 * Format: security-labs-{version}[--{inferenceId}].zip
 * Version uses `YYYY.MM.DD-HHMMSS` (UTC), with legacy `YYYY.MM.DD` still supported.
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
 * Validates a Security Labs version string.
 * Accepts `YYYY.MM.DD-HHMMSS` (UTC) and legacy `YYYY.MM.DD`.
 */
export declare const isValidSecurityLabsVersion: (version: string) => boolean;
