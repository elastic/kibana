/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamsUnit } from '@kbn/streams-schema';

const REMOTE_ELASTICSEARCH_TYPE = 'remote_elasticsearch';

export interface RemoteDestinationToProbe {
  id: string;
  endpoint: string;
  apiKey: string | undefined;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

// The PUT route does not schema-validate the unit, so every level is checked before it is read.
const destinationsOf = (unit: StreamsUnit.Configuration | undefined): unknown[] =>
  Array.isArray(unit?.destinations) ? unit.destinations : [];

const configValue = (config: unknown, name: string): unknown =>
  Array.isArray(config)
    ? config.find((entry) => isRecord(entry) && entry.name === name)?.value
    : undefined;

/** The secret name of a `{ credential: <name> }` config value, or undefined for any other value. */
export const credentialReferenceName = (value: unknown): string | undefined => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return undefined;
  }
  const keys = Object.keys(value);
  const { credential } = value as { credential?: unknown };
  return keys.length === 1 && keys[0] === 'credential' && typeof credential === 'string'
    ? credential
    : undefined;
};

const resolveApiKey = (value: unknown, secrets: StreamsUnit.Secrets): string | undefined => {
  const name = credentialReferenceName(value);
  return name !== undefined && Object.hasOwn(secrets, name) ? secrets[name] : undefined;
};

const toRemoteDestination = (
  destination: unknown,
  secrets: StreamsUnit.Secrets
): RemoteDestinationToProbe | undefined => {
  if (
    !isRecord(destination) ||
    destination.type !== REMOTE_ELASTICSEARCH_TYPE ||
    typeof destination.id !== 'string'
  ) {
    return undefined;
  }
  const endpoint = configValue(destination.config, 'endpoint');
  if (typeof endpoint !== 'string') {
    return undefined;
  }
  return {
    id: destination.id,
    endpoint,
    apiKey: resolveApiKey(configValue(destination.config, 'api_key'), secrets),
  };
};

/** Remote destinations that are new on the unit or whose endpoint or key changed since the stored unit. */
export const selectRemoteDestinationsToProbe = ({
  unit,
  secrets,
  previousUnit,
  previousSecrets,
}: {
  unit: StreamsUnit.Configuration;
  secrets: StreamsUnit.Secrets;
  previousUnit: StreamsUnit.Configuration | undefined;
  previousSecrets: StreamsUnit.Secrets;
}): RemoteDestinationToProbe[] => {
  const previousById = new Map(
    destinationsOf(previousUnit).flatMap((destination) => {
      const remote = toRemoteDestination(destination, previousSecrets);
      return remote ? [[remote.id, remote] as const] : [];
    })
  );

  return destinationsOf(unit).flatMap((destination) => {
    const remote = toRemoteDestination(destination, secrets);
    if (!remote) {
      return [];
    }
    const previous = previousById.get(remote.id);
    const changed =
      !previous || previous.endpoint !== remote.endpoint || previous.apiKey !== remote.apiKey;
    return changed ? [remote] : [];
  });
};
