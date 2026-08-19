/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
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
 * Validates each artifact's `data` against its registered `dataSchema`. An
 * unregistered type passes through untouched — the type's plugin may be
 * disabled or rolled back, and rejecting here would fail writes that were
 * legal under the schema the type once registered. Limits are enforced once,
 * at registration, where `assertBoundedSchema` proves every registrable
 * schema is fully bounded. Throws a controlled badRequest on failure.
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
