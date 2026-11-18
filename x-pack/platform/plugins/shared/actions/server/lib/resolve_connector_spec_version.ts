/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { i18n } from '@kbn/i18n';
import { CONNECTOR_SPEC_VERSION_MAX_LENGTH } from '../../common';
import type { ActionsConfigurationUtilities } from '../actions_config';
import type { ActionType } from '../types';
import { generateConfigSchema } from './single_file_connectors/generate_config_schema';
import { generateSecretsSchema } from './single_file_connectors/generate_secrets_schema';

/** Resolves a connector's schema version and builds validators for the selected spec. */
export const resolveConnectorSpecVersion = ({
  actionType,
  specVersion,
  configurationUtilities,
}: {
  actionType: ActionType;
  specVersion?: string;
  configurationUtilities: ActionsConfigurationUtilities;
}): { resolvedSpecVersion: string | undefined; actionTypeForValidation: ActionType } => {
  const { id: actionTypeId } = actionType;
  const { specs } = actionType;
  let resolvedSpecVersion: string | undefined;
  let actionTypeForValidation = actionType;

  if (specVersion !== undefined || specs !== undefined) {
    const requestedVersion = specVersion ?? '1';
    const versionMatch = /^(0|[1-9]\d*)(?:\.(0|[1-9]\d*))?$/.exec(requestedVersion);
    if (
      !versionMatch ||
      versionMatch[0] !== requestedVersion ||
      requestedVersion.length > CONNECTOR_SPEC_VERSION_MAX_LENGTH
    ) {
      throw Boom.badRequest(
        i18n.translate('xpack.actions.serverSideErrors.invalidSpecVersionErrorMessage', {
          defaultMessage:
            'Invalid spec_version "{version}". Use a major version such as "1" or an exact version such as "1.3".',
          values: { version: requestedVersion },
        })
      );
    }

    const [, requestedMajor, requestedMinor] = versionMatch;
    if (requestedMinor !== undefined) {
      resolvedSpecVersion = specs?.has(requestedVersion) ? requestedVersion : undefined;
    } else {
      let latestMinor: string | undefined;
      for (const version of specs?.keys() ?? []) {
        const candidateMatch = /^(0|[1-9]\d*)\.(0|[1-9]\d*)$/.exec(version);
        if (
          !candidateMatch ||
          candidateMatch[0] !== version ||
          version.length > CONNECTOR_SPEC_VERSION_MAX_LENGTH
        ) {
          continue;
        }
        const [, major, minor] = candidateMatch;
        // Compare integer strings without losing precision for large minor versions.
        if (
          major === requestedMajor &&
          (latestMinor === undefined ||
            minor.length > latestMinor.length ||
            (minor.length === latestMinor.length && minor > latestMinor))
        ) {
          resolvedSpecVersion = version;
          latestMinor = minor;
        }
      }
    }

    const selectedSpec = resolvedSpecVersion ? specs?.get(resolvedSpecVersion) : undefined;
    if (!selectedSpec) {
      throw Boom.badRequest(
        i18n.translate('xpack.actions.serverSideErrors.unknownSpecVersionErrorMessage', {
          defaultMessage: 'Unknown spec_version "{version}" for connector type "{actionTypeId}".',
          values: { version: requestedVersion, actionTypeId },
        })
      );
    }

    actionTypeForValidation = {
      ...actionType,
      validate: {
        ...actionType.validate,
        config: generateConfigSchema(selectedSpec.schema, Object.keys(selectedSpec.actions ?? {})),
        secrets: generateSecretsSchema(selectedSpec.auth, configurationUtilities),
      },
    };
  }

  return { resolvedSpecVersion, actionTypeForValidation };
};
