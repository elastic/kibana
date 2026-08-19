/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { DEFAULT_ARTIFACT_DATA_FIELD_LIMIT } from '@kbn/alerting-v2-constants';
import { stringifyZodError } from '@kbn/zod-helpers/v4';
import { treeifyError } from '@kbn/zod/v4';
import { ALERTING_ERROR_CODES } from '../errors/error_codes';
import type { ArtifactTypeRegistry } from './artifact_type_registry';
import type { RuleArtifactLike } from './types';

const invalidArtifactData = (
  artifact: RuleArtifactLike,
  message: string,
  errors?: unknown
): Boom.Boom =>
  Boom.badRequest(message, {
    code: ALERTING_ERROR_CODES.INVALID_ARTIFACT_DATA,
    details: {
      artifact_id: artifact.id,
      artifact_type: artifact.type,
      ...(errors === undefined ? {} : { errors }),
    },
  });

/**
 * Bounds an artifact whose type nobody registered. A registered type is bounded
 * by its own `dataSchema`, which `assertBoundedSchema` proves is fully bounded
 * before it can be registered at all; without a schema there is nothing to
 * derive a limit from, so every field gets the same generic ceiling.
 */
function validateUnregisteredArtifact(artifact: RuleArtifactLike): void {
  for (const [field, value] of Object.entries(artifact.data)) {
    const isString = typeof value === 'string';
    // A structured value is measured serialized so that nesting a payload in an
    // object or array cannot buy more room than a plain string field gets.
    const size = isString ? value.length : (JSON.stringify(value) ?? '').length;

    if (size > DEFAULT_ARTIFACT_DATA_FIELD_LIMIT) {
      throw invalidArtifactData(
        artifact,
        `Artifact "${artifact.id}" of type "${artifact.type}" has invalid data: ${field}: ${
          isString ? 'must be at most' : 'must serialize to at most'
        } ${DEFAULT_ARTIFACT_DATA_FIELD_LIMIT} characters. Register the artifact type to declare its own limits.`
      );
    }
  }
}

/**
 * Validates each artifact's `data`: against its registered `dataSchema` when the
 * type is registered, against a generic per-field size ceiling when it is not.
 * Throws a controlled badRequest on failure.
 */
export function validateArtifactsAgainstRegistry(
  artifacts: RuleArtifactLike[] | undefined,
  registry: ArtifactTypeRegistry
): void {
  if (!artifacts?.length) {
    return;
  }

  for (const artifact of artifacts) {
    const def = registry.get(artifact.type);
    if (!def) {
      validateUnregisteredArtifact(artifact);
      continue;
    }

    let result;
    try {
      result = def.dataSchema.safeParse(artifact.data);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw invalidArtifactData(
        artifact,
        `Artifact "${artifact.id}" of type "${artifact.type}" failed validation: ${message}`
      );
    }

    if (!result.success) {
      throw invalidArtifactData(
        artifact,
        `Artifact "${artifact.id}" of type "${artifact.type}" has invalid data: ${stringifyZodError(
          result.error
        )}`,
        treeifyError(result.error)
      );
    }
  }
}
