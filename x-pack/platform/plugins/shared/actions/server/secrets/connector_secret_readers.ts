/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { connectorsSpecs } from '@kbn/connector-specs';
import type { ConnectorSpec } from '@kbn/connector-specs';
import { SecretValidationError } from '@kbn/secrets';

/**
 * The connector types that can hold secrets: the ones whose spec has a `secretManager` member.
 * A "secret manager" is the external service that keeps the values (GCP Secret Manager, AWS
 * Parameter Store), and a connector is how Kibana talks to it. How a value is read comes from
 * that member: nothing here is specific to one connector.
 */
const getSecretConnectorSpecs = (): ConnectorSpec[] =>
  Object.values(connectorsSpecs).filter(({ secretManager }) => secretManager !== undefined);

export interface ConnectorSecretReadParams {
  subAction: string;
  subActionParams: Record<string, unknown>;
}

/** Reads one value through one type of connector, the way its spec says to. */
export interface ConnectorSecretReader {
  /** The name of the connector type, for the user. */
  readonly displayName: string;
  /** What a reference looks like for this connector type, as a hint for the user. */
  readonly referenceFormat: string;
  /**
   * Turns the reference of a secret into the connector call that reads its value.
   * Throws `SecretValidationError` when the reference is not valid for this connector type.
   */
  getReadParams(reference: string): ConnectorSecretReadParams;
  /** Takes the value out of what the connector call returned. */
  getValue(data: unknown): string | undefined;
}

const createConnectorSecretReader = ({
  metadata: { displayName },
  actions,
  secretManager,
}: ConnectorSpec): ConnectorSecretReader => {
  if (!secretManager) {
    throw new Error(`The ${displayName} connector does not say how to read a secret value.`);
  }
  const { action: actionName, referenceFormat, toInput, getValue } = secretManager;
  const action = Object.hasOwn(actions, actionName) ? actions[actionName] : undefined;
  if (!action) {
    throw new Error(
      `The ${displayName} connector reads secret values with "${actionName}", an action it does not have.`
    );
  }

  return {
    displayName,
    referenceFormat,
    getReadParams: (reference) => {
      const input = toInput(reference);
      if (!input) {
        throw new SecretValidationError(
          `A reference for the ${displayName} connector looks like ${referenceFormat}`
        );
      }
      // The connector's own rules for the input of its action.
      const result = action.input.safeParse(input);
      if (!result.success) {
        throw new SecretValidationError(
          result.error.issues.map(({ message }) => message).join('. ')
        );
      }
      return { subAction: actionName, subActionParams: input };
    },
    getValue,
  };
};

/**
 * Creates the readers of the connector types that can hold secrets, by connector type id.
 * Throws when one of them reads secrets with an action it does not have.
 */
export const createConnectorSecretReaders = (): ReadonlyMap<string, ConnectorSecretReader> =>
  new Map(
    getSecretConnectorSpecs().map((spec) => [spec.metadata.id, createConnectorSecretReader(spec)])
  );
