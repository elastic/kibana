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
 * The connector types that can hold secrets. How a value is read comes from the
 * `secretManager` member of each spec: nothing here is specific to one connector.
 */
const SECRET_MANAGER_SPECS: readonly ConnectorSpec[] = [
  connectorsSpecs.GcpSecretManager,
  connectorsSpecs.AwsSsmConnector,
];

export interface SecretManagerReadParams {
  subAction: string;
  subActionParams: Record<string, unknown>;
}

/** Reads one value through one type of connector, the way its spec says to. */
export interface SecretManager {
  /**
   * Turns the reference of a secret into the connector call that reads its value.
   * Throws `SecretValidationError` when the reference is not valid for this manager.
   */
  getReadParams(reference: string): SecretManagerReadParams;
  /** Takes the value out of what the connector call returned. */
  getValue(data: unknown): string | undefined;
}

const createSecretManager = ({
  metadata: { displayName },
  actions,
  secretManager,
}: ConnectorSpec): SecretManager => {
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
 * Throws when a listed connector type cannot be used as a secret manager.
 */
export const createSecretManagers = (): ReadonlyMap<string, SecretManager> =>
  new Map(SECRET_MANAGER_SPECS.map((spec) => [spec.metadata.id, createSecretManager(spec)]));
