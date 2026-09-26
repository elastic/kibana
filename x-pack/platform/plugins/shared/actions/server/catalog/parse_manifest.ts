/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, ZodError } from '@kbn/zod/v4';
import type { Logger } from '@kbn/core/server';
import { LICENSE_TYPE, type LicenseType } from '@kbn/licensing-types';
import { areValidFeatures } from '../../common';
import type { CatalogManifest, CatalogTypeMetadata } from './types';

const LICENSE_TYPES = Object.values(LICENSE_TYPE).filter(
  (value): value is LicenseType => typeof value === 'string'
) as [LicenseType, ...LicenseType[]];

const contentHashSchema = z.string().regex(/^sha256:[a-f0-9]{64}$/);
const connectorIdSchema = z.string().regex(/^\.[a-z0-9_-]+$/);
const specVersionSchema = z.string().regex(/^\d+\.\d+$/);
const relativeAssetPathSchema = z
  .string()
  .min(1)
  .max(512)
  .refine(
    (path) => !path.startsWith('/') && !/^[a-z][a-z0-9+.-]*:/i.test(path),
    'Asset paths must be relative to the catalog manifest.'
  );

const typeMetadataSchema = z.looseObject({
  displayName: z.string().min(1),
  description: z.string().min(1),
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
    .array(z.string())
    .min(1)
    .refine(areValidFeatures, { message: 'Unknown connector feature id' }),
});

const catalogRowSchema = z.looseObject({
  id: connectorIdSchema,
  version: specVersionSchema,
  definitionUrl: z.string().min(1),
  contentHash: contentHashSchema,
});

const catalogManifestSchema = z.looseObject({
  schemaVersion: z.literal(1),
  catalogVersion: z.string().min(1),
  sequence: z.number().int().min(0),
  previousCatalogVersion: z.string().min(1).optional(),
  typeMetadata: z.record(z.string(), z.unknown()),
  connectors: z.array(z.unknown()).min(1),
});

const formatIssues = (error: ZodError): string =>
  error.issues
    .map((issue) => `${issue.path.length > 0 ? issue.path.join('.') : '(root)'}: ${issue.message}`)
    .join(', ');

/** Parses a signed catalog.json document. Unknown root and per-id metadata fields are ignored. */
export const parseCatalogManifest = (value: unknown, logger: Logger): CatalogManifest => {
  let parsed;
  try {
    parsed = catalogManifestSchema.parse(value);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new Error(`Declarative connector catalog is invalid: ${formatIssues(error)}`, {
        cause: error,
      });
    }
    throw error;
  }

  const typeMetadata: Record<string, CatalogTypeMetadata> = {};
  const skippedTypeMetadata: string[] = [];
  for (const [id, raw] of Object.entries(parsed.typeMetadata)) {
    if (!connectorIdSchema.safeParse(id).success) {
      skippedTypeMetadata.push(id);
      logger.warn(`Skipping catalog type metadata for invalid id "${id}"`);
      continue;
    }
    const result = typeMetadataSchema.safeParse(raw);
    if (!result.success) {
      skippedTypeMetadata.push(id);
      logger.warn(`Skipping catalog type metadata for "${id}": ${formatIssues(result.error)}`);
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
      logger.warn(`Skipping catalog row ${index}: ${formatIssues(result.error)}`);
      continue;
    }
    if (typeMetadata[result.data.id] === undefined) {
      logger.warn(
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
    throw new Error('Declarative connector catalog is invalid: no usable connector rows');
  }

  return {
    schemaVersion: 1,
    catalogVersion: parsed.catalogVersion,
    sequence: parsed.sequence,
    previousCatalogVersion: parsed.previousCatalogVersion,
    typeMetadata,
    connectors,
    skippedTypeMetadata,
  };
};
