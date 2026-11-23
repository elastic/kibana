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

const isValidVersionSegment = (part?: string): boolean => {
  const value = Number(part);
  return Number.isSafeInteger(value) && value >= 0 && String(value) === part;
};

const parseSpecVersion = (value: string): { major: number; minor?: number } | undefined => {
  if (value.length > CONNECTOR_SPEC_VERSION_MAX_LENGTH) return undefined;

  const [majorPart, minorPart, ...rest] = value.split('.');
  if (rest.length > 0 || !isValidVersionSegment(majorPart) || Number(majorPart) < 1) {
    return undefined;
  }

  // A missing minor ("1") is a major selector; a present but invalid one ("1.", "1.x") is not.
  if (minorPart === undefined) return { major: Number(majorPart) };
  if (!isValidVersionSegment(minorPart)) return undefined;

  return { major: Number(majorPart), minor: Number(minorPart) };
};

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

  if (specVersion === undefined && specs === undefined) {
    return { resolvedSpecVersion: undefined, actionTypeForValidation: actionType };
  }

  let resolvedSpecVersion: string | undefined;
  const requestedVersion = specVersion ?? '1';
  const { major, minor } = parseSpecVersion(requestedVersion) ?? {};

  if (major === undefined) {
    throw Boom.badRequest(
      i18n.translate('xpack.actions.serverSideErrors.invalidSpecVersionErrorMessage', {
        defaultMessage:
          'Invalid spec_version "{version}". Use a major version such as "1" or an exact version such as "1.3".',
        values: { version: requestedVersion },
      })
    );
  }

  if (minor !== undefined) {
    resolvedSpecVersion = specs?.has(requestedVersion) ? requestedVersion : undefined;
  } else {
    let latestMinor: number | undefined;
    for (const version of specs?.keys() ?? []) {
      const candidate = parseSpecVersion(version);
      if (candidate?.minor === undefined || candidate.major !== major) {
        continue;
      }
      if (latestMinor === undefined || candidate.minor > latestMinor) {
        resolvedSpecVersion = version;
        latestMinor = candidate.minor;
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

  const actionTypeForValidation = {
    ...actionType,
    validate: {
      ...actionType.validate,
      config: generateConfigSchema(selectedSpec.schema, Object.keys(selectedSpec.actions ?? {})),
      secrets: generateSecretsSchema(selectedSpec.auth, configurationUtilities),
    },
  };

  return { resolvedSpecVersion, actionTypeForValidation };
};
