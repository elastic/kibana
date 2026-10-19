/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isImpliedDefaultElserInferenceId } from './is_default_inference_endpoint';
import { type ProductName, DocumentationProduct } from './product';
import { type ResourceType, ResourceTypes } from './resource_type';

const allowedProductNames: (ProductName | 'openapi')[] = [
  ...Object.values(DocumentationProduct),
  'openapi',
];

export const DEFAULT_ELSER = '.elser-2-elasticsearch';

/**
 * Security Labs artifact versions.
 *
 * - Current: `YYYY.MM.DD-HHMMSS` (UTC) — unique per publish so same-day rebuilds
 *   are distinct and lexicographically sortable for "latest".
 * - Legacy: `YYYY.MM.DD` — still accepted so existing CDN artifacts keep working.
 */
const SECURITY_LABS_VERSION_PATTERN = /^\d{4}\.\d{2}\.\d{2}(-\d{6})?$/;

/**
 * Builds a UTC timestamp version for a new Security Labs artifact publish.
 * Example: `2026.07.10-152831`
 */
export const getSecurityLabsUtcTimestampVersion = (date: Date = new Date()): string => {
  const pad = (value: number) => String(value).padStart(2, '0');
  return (
    `${date.getUTCFullYear()}.` +
    `${pad(date.getUTCMonth() + 1)}.` +
    `${pad(date.getUTCDate())}-` +
    `${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}`
  );
};

/**
 * Derives the legacy `YYYY.MM.DD` version from a timestamp version.
 *
 * Used to publish a second ELSER CDN object for Kibana 9.3/9.4 BWC — those
 * releases only parse date-only names from
 * https://github.com/elastic/kibana/pull/246099. Returns undefined when
 * `version` is already date-only or not a timestamp version.
 */
export const getSecurityLabsLegacyDateVersion = (version: string): string | undefined => {
  const match = version.match(/^(\d{4}\.\d{2}\.\d{2})-\d{6}$/);
  return match?.[1];
};

export const getArtifactName = ({
  productName,
  productVersion,
  excludeExtension = false,
  inferenceId,
}: {
  productName: ProductName;
  productVersion: string;
  excludeExtension?: boolean;
  inferenceId?: string;
}): string => {
  const ext = excludeExtension ? '' : '.zip';
  return `kb-product-doc-${productName}-${productVersion}${
    inferenceId && !isImpliedDefaultElserInferenceId(inferenceId) ? `--${inferenceId}` : ''
  }${ext}`.toLowerCase();
};

export const parseArtifactName = (artifactName: string) => {
  // drop ".zip" (if any)
  let name = artifactName.endsWith('.zip') ? artifactName.slice(0, -4) : artifactName;

  // pull off the final  "--<inferenceId>" (if present)
  let inferenceId: string | undefined;
  const lastDashDash = name.lastIndexOf('--');
  if (lastDashDash !== -1) {
    inferenceId = name.slice(lastDashDash + 2);
    name = name.slice(0, lastDashDash); // strip it for the base match
  }

  // match the main pattern kb-product-doc-<product>-<version>
  const match = name.match(/^kb-product-doc-([a-z]+)-([0-9]+\.[0-9]+|latest)$/);
  if (!match) return;

  const productName = match[1].toLowerCase() as ProductName;
  const productVersion = match[2].toLowerCase();

  if (!allowedProductNames.includes(productName)) return;

  return {
    productName,
    productVersion,
    ...(inferenceId ? { inferenceId } : {}),
  };
};

/**
 * Generates the artifact name for Security Labs content.
 * Format: security-labs-{version}[--{inferenceId}].zip
 * Version uses `YYYY.MM.DD-HHMMSS` (UTC), with legacy `YYYY.MM.DD` still supported.
 */
export const getSecurityLabsArtifactName = ({
  version,
  excludeExtension = false,
  inferenceId,
}: {
  version: string;
  excludeExtension?: boolean;
  inferenceId?: string;
}): string => {
  const ext = excludeExtension ? '' : '.zip';
  return `security-labs-${version}${
    inferenceId && !isImpliedDefaultElserInferenceId(inferenceId) ? `--${inferenceId}` : ''
  }${ext}`.toLowerCase();
};

/**
 * Parses a Security Labs artifact name to extract version and optional inference ID.
 */
export const parseSecurityLabsArtifactName = (
  artifactName: string
):
  | {
      version: string;
      inferenceId?: string;
      resourceType: typeof ResourceTypes.securityLabs;
    }
  | undefined => {
  // drop ".zip" (if any)
  let name = artifactName.endsWith('.zip') ? artifactName.slice(0, -4) : artifactName;

  // pull off the final "--<inferenceId>" (if present)
  let inferenceId: string | undefined;
  const lastDashDash = name.lastIndexOf('--');
  if (lastDashDash !== -1) {
    inferenceId = name.slice(lastDashDash + 2);
    name = name.slice(0, lastDashDash);
  }

  // Current: security-labs-YYYY.MM.DD-HHMMSS ; legacy: security-labs-YYYY.MM.DD
  const match = name.match(/^security-labs-(\d{4}\.\d{2}\.\d{2}(?:-\d{6})?)$/);
  if (!match) return;

  const version = match[1];

  return {
    version,
    resourceType: ResourceTypes.securityLabs,
    ...(inferenceId ? { inferenceId } : {}),
  };
};

/**
 * Determines the resource type from an artifact name.
 */
export const getResourceTypeFromArtifactName = (artifactName: string): ResourceType | undefined => {
  if (parseArtifactName(artifactName)) {
    return ResourceTypes.productDoc;
  }
  if (parseSecurityLabsArtifactName(artifactName)) {
    return ResourceTypes.securityLabs;
  }
  return undefined;
};

/**
 * Validates a Security Labs version string.
 * Accepts `YYYY.MM.DD-HHMMSS` (UTC) and legacy `YYYY.MM.DD`.
 */
export const isValidSecurityLabsVersion = (version: string): boolean => {
  return SECURITY_LABS_VERSION_PATTERN.test(version);
};
