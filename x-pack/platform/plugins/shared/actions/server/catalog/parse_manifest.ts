/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazySchema, z, ZodError } from '@kbn/zod/v4';
import { LICENSE_TYPE, type LicenseType } from '@kbn/licensing-types';
import { areValidFeatures } from '../../common';
import type { CatalogLogOnce } from './log_once';
import { SPEC_VERSION_REGEX } from './spec_version_format';
import type { CatalogManifest, CatalogTypeMetadata } from './types';

const LICENSE_TYPES = Object.values(LICENSE_TYPE).filter(
  (value): value is LicenseType => typeof value === 'string'
) as [LicenseType, ...LicenseType[]];

const contentHashSchema = lazySchema(() => z.string().regex(/^sha256:[a-f0-9]{64}$/));
const connectorIdSchema = lazySchema(() =>
  z
    .string()
    .max(128)
    .regex(/^\.[a-z0-9_-]+$/)
);
const specVersionSchema = lazySchema(() => z.string().regex(SPEC_VERSION_REGEX));
const relativeAssetPathSchema = lazySchema(() =>
  z
    .string()
    .min(1)
    .max(512)
    .refine(
      (path) => !path.startsWith('/') && !path.includes('..') && !/^[a-z][a-z0-9+.-]*:/i.test(path),
      'Asset paths must be relative to the catalog manifest.'
    )
);

const typeMetadataSchema = lazySchema(() =>
  z.looseObject({
    displayName: z.string().min(1).max(256),
    description: z.string().min(1).max(4096),
    docsUrl: z.string().max(2048).optional(),
    icon: z
      .looseObject({
        path: relativeAssetPathSchema,
        contentHash: contentHashSchema,
      })
      .optional(),
    minimumLicense: z.enum(LICENSE_TYPES),
    isTechnicalPreview: z.boolean().optional(),
    supportedFeatureIds: z
      .array(z.string().max(128))
      .min(1)
      .max(32)
      .refine(areValidFeatures, { message: 'Unknown connector feature id' }),
  })
);

const catalogRowSchema = lazySchema(() =>
  z.looseObject({
    id: connectorIdSchema,
    version: specVersionSchema,
    definitionUrl: relativeAssetPathSchema,
    contentHash: contentHashSchema,
  })
);

const catalogManifestSchema = lazySchema(() =>
  z.looseObject({
    schemaVersion: z.literal(1),
    catalogVersion: z.string().min(1).max(256),
    sequence: z.number().int().min(0),
    previousCatalogVersion: z.string().min(1).max(256).optional(),
    typeMetadata: z.record(z.string().max(128), z.unknown()),
    connectors: z.array(z.unknown()).min(1).max(1000),
  })
);

const formatIssues = (error: ZodError): string =>
  error.issues
    .map((issue) => `${issue.path.length > 0 ? issue.path.join('.') : '(root)'}: ${issue.message}`)
    .join(', ');

/** Parses a signed catalog.json document. Unknown root and metadata fields are ignored. */
export const parseCatalogManifest = (value: unknown, logOnce: CatalogLogOnce): CatalogManifest => {
  let parsed;
  try {
    parsed = catalogManifestSchema.parse(value);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new Error(`Connector catalog is invalid: ${formatIssues(error)}`, {
        cause: error,
      });
    }
    throw error;
  }

  const typeMetadata: Record<string, CatalogTypeMetadata> = {};
  for (const [id, raw] of Object.entries(parsed.typeMetadata)) {
    if (!connectorIdSchema.safeParse(id).success) {
      logOnce.warn(
        parsed.catalogVersion,
        `metadata:${id}`,
        `Skipping catalog type metadata for invalid id "${id}"`
      );
      continue;
    }
    const result = typeMetadataSchema.safeParse(raw);
    if (!result.success) {
      logOnce.warn(
        parsed.catalogVersion,
        `metadata:${id}`,
        `Skipping catalog type metadata for "${id}": ${formatIssues(result.error)}`
      );
      continue;
    }
    typeMetadata[id] = {
      displayName: result.data.displayName,
      description: result.data.description,
      docsUrl: result.data.docsUrl,
      icon: result.data.icon,
      minimumLicense: result.data.minimumLicense,
      isTechnicalPreview: result.data.isTechnicalPreview,
      supportedFeatureIds: result.data.supportedFeatureIds,
    };
  }

  const connectors: CatalogManifest['connectors'] = [];
  for (const [index, rawRow] of parsed.connectors.entries()) {
    const result = catalogRowSchema.safeParse(rawRow);
    if (!result.success) {
      logOnce.warn(
        parsed.catalogVersion,
        `row:${index}`,
        `Skipping catalog row ${index}: ${formatIssues(result.error)}`
      );
      continue;
    }
    if (typeMetadata[result.data.id] === undefined) {
      logOnce.warn(
        parsed.catalogVersion,
        `row:${result.data.id}@${result.data.version}`,
        `Skipping catalog row "${result.data.id}@${result.data.version}": type metadata is missing or invalid`
      );
      continue;
    }
    connectors.push({
      id: result.data.id,
      version: result.data.version,
      definitionUrl: result.data.definitionUrl,
      contentHash: result.data.contentHash,
    });
  }

  if (connectors.length === 0) {
    throw new Error('Connector catalog is invalid: no usable connector rows');
  }

  return {
    schemaVersion: 1,
    catalogVersion: parsed.catalogVersion,
    sequence: parsed.sequence,
    previousCatalogVersion: parsed.previousCatalogVersion,
    typeMetadata,
    connectors,
  };
};
