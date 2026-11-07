/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import { getCustomRules } from '../lib/boost_store';
import { BoostRequestError } from '../lib/errors';
import { getPrototypeSettings } from './prototype_settings';

const TIMEOUT_MESSAGE = "Elasticsearch didn't respond in time.";

/**
 * Fails deleting the first custom rule, by name, that uses each profile, while the prototype menu
 * asks. The failed rule stays, so it stays first, and the rest delete: deleting a profile with two
 * or more rules partly fails, and with one, fails.
 */
export const simulateRuleDeleteFailure = async (
  client: SavedObjectsClientContract,
  name: string
): Promise<void> => {
  const { fails_rule_deletes: failsRuleDeletes } = await getPrototypeSettings(client);
  if (!failsRuleDeletes) {
    return;
  }
  const rules = await getCustomRules(client);
  const rule = rules.find(({ name: ruleName }) => ruleName === name);
  if (!rule) {
    return;
  }
  const [firstRuleName] = rules
    .filter(({ boost_profile: profileName }) => profileName === rule.boost_profile)
    .map(({ name: ruleName }) => ruleName)
    .sort((a, b) => a.localeCompare(b));
  if (firstRuleName === name) {
    throw new BoostRequestError(504, TIMEOUT_MESSAGE);
  }
};

/** Fails deleting any custom profile, while the prototype menu asks. */
export const simulateProfileDeleteFailure = async (
  client: SavedObjectsClientContract
): Promise<void> => {
  const { fails_profile_deletes: failsProfileDeletes } = await getPrototypeSettings(client);
  if (failsProfileDeletes) {
    throw new BoostRequestError(504, TIMEOUT_MESSAGE);
  }
};
