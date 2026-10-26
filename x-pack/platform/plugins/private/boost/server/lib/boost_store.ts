/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { BOOST_SAVED_OBJECT_TYPE, BOOST_SETTINGS_SAVED_OBJECT_ID } from '../../common/constants';
import {
  BUILTIN_DATA_STREAMS_PROFILE_NAMES,
  BUILTIN_INDICES_PROFILE_NAMES,
  BUILTIN_PROFILES,
  DEFAULT_DATA_STREAMS_RULE_NAME,
  DEFAULT_INDICES_RULE_NAME,
  DEFAULT_PROFILE_KEYS,
  DEFAULT_RULE_PROFILES,
  createDefaultRules,
} from '../../common/presets';
import { findConflictingRule } from '../../common/resolution';
import type {
  BoostProfile,
  BoostProfileInput,
  BoostProfileType,
  BoostRule,
  BoostRuleInput,
  BoostSettings,
  BoostState,
  DataStreamsWindowId,
  DefaultRuleProfiles,
  IndicesPresetId,
} from '../../common/types';
import { getDataSources } from './data_sources';
import { BoostRequestError } from './errors';

/** Settings saved before the project's defaults and boost rules shared one page. */
interface LegacySettingsAttributes {
  simple?: { indices: IndicesPresetId; data_streams: { window: DataStreamsWindowId } };
  /** The default rules' custom profiles, or `null` where they used the simple settings. */
  custom_defaults?: Record<keyof DefaultRuleProfiles, string | null>;
}

type SettingsAttributes = LegacySettingsAttributes & {
  kind: 'settings';
  /** Missing from legacy settings. */
  default_profiles?: DefaultRuleProfiles;
};

type ProfileAttributes = BoostProfileInput & { kind: 'profile' };

type RuleAttributes = Omit<BoostRuleInput, 'index_patterns'> & {
  kind: 'rule';
  index_patterns?: string[];
  /** Rules saved before a rule could hold several targets. */
  index_pattern?: string;
};

const PROTOTYPE_KIND_FILTER = (kind: 'profile' | 'rule') =>
  `${BOOST_SAVED_OBJECT_TYPE}.attributes.kind: ${kind}`;

const profileId = (name: string) => `profile-${name}`;

const ruleId = (name: string) => `rule-${name}`;

const DEFAULT_RULE_NAMES = [DEFAULT_INDICES_RULE_NAME, DEFAULT_DATA_STREAMS_RULE_NAME];

const BUILTIN_PROFILE_NAMES = BUILTIN_PROFILES.map(({ name }) => name);

/** Built-in profiles' names before they took the `_` prefix Elasticsearch reserves for them. */
const LEGACY_BUILTIN_PROFILE_NAMES: Readonly<Record<string, string>> = {
  'elastic-on-demand': BUILTIN_INDICES_PROFILE_NAMES.on_demand,
  'elastic-performant': BUILTIN_INDICES_PROFILE_NAMES.performant,
  'elastic-high-availability': BUILTIN_INDICES_PROFILE_NAMES.high_availability,
  'elastic-last-1-day': BUILTIN_DATA_STREAMS_PROFILE_NAMES.last_1_day,
  'elastic-last-3-days': BUILTIN_DATA_STREAMS_PROFILE_NAMES.last_3_days,
  'elastic-last-7-days': BUILTIN_DATA_STREAMS_PROFILE_NAMES.last_7_days,
};

/** A saved profile name, with a built-in profile's legacy name replaced by its current one. */
const toCurrentProfileName = (name: string): string => LEGACY_BUILTIN_PROFILE_NAMES[name] ?? name;

/**
 * The default rules' profiles from legacy settings: a custom profile where one was set, and
 * otherwise the simple-mode preset, as their advanced mode applied them.
 */
const fromLegacySettings = ({
  simple,
  custom_defaults: customDefaults,
}: LegacySettingsAttributes): DefaultRuleProfiles => ({
  indices_profile:
    customDefaults?.indices_profile ??
    (simple
      ? BUILTIN_INDICES_PROFILE_NAMES[simple.indices]
      : DEFAULT_RULE_PROFILES.indices_profile),
  data_streams_profile:
    customDefaults?.data_streams_profile ??
    (simple
      ? BUILTIN_DATA_STREAMS_PROFILE_NAMES[simple.data_streams.window]
      : DEFAULT_RULE_PROFILES.data_streams_profile),
});

const getSettings = async (client: SavedObjectsClientContract): Promise<BoostSettings> => {
  try {
    const {
      attributes: { default_profiles: defaultProfiles, ...legacy },
      updated_at: updatedAt,
    } = await client.get<SettingsAttributes>(
      BOOST_SAVED_OBJECT_TYPE,
      BOOST_SETTINGS_SAVED_OBJECT_ID
    );

    return {
      default_profiles: defaultProfiles
        ? {
            indices_profile: toCurrentProfileName(defaultProfiles.indices_profile),
            data_streams_profile: toCurrentProfileName(defaultProfiles.data_streams_profile),
          }
        : fromLegacySettings(legacy),
      updated_at: updatedAt,
    };
  } catch (error) {
    if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
      return { default_profiles: DEFAULT_RULE_PROFILES };
    }
    throw error;
  }
};

const saveSettings = async (
  client: SavedObjectsClientContract,
  { default_profiles: defaultProfiles }: BoostSettings
): Promise<void> => {
  const attributes: SettingsAttributes = { kind: 'settings', default_profiles: defaultProfiles };

  await client.create(BOOST_SAVED_OBJECT_TYPE, attributes, {
    id: BOOST_SETTINGS_SAVED_OBJECT_ID,
    overwrite: true,
  });
};

const getCustomProfiles = async (client: SavedObjectsClientContract): Promise<BoostProfile[]> => {
  const { saved_objects: savedObjects } = await client.find<ProfileAttributes>({
    type: BOOST_SAVED_OBJECT_TYPE,
    filter: PROTOTYPE_KIND_FILTER('profile'),
    perPage: 1000,
  });

  return savedObjects
    .map(({ attributes: { kind, ...profile } }) => ({ ...profile, is_builtin: false }))
    .sort((a, b) => a.name.localeCompare(b.name));
};

/** Custom rules, highest priority first. */
const getCustomRules = async (client: SavedObjectsClientContract): Promise<BoostRule[]> => {
  const { saved_objects: savedObjects } = await client.find<RuleAttributes>({
    type: BOOST_SAVED_OBJECT_TYPE,
    filter: PROTOTYPE_KIND_FILTER('rule'),
    perPage: 1000,
  });

  return savedObjects
    .map(
      ({
        attributes: { kind, index_patterns: indexPatterns, index_pattern: legacyPattern, ...rule },
      }) => ({
        ...rule,
        index_patterns: indexPatterns ?? (legacyPattern ? [legacyPattern] : []),
        boost_profile: toCurrentProfileName(rule.boost_profile),
        is_builtin: false,
      })
    )
    .sort((a, b) => b.priority - a.priority || a.name.localeCompare(b.name));
};

/** Returns the settings, the profiles and rules, and the project's data sources. */
export const getState = async (
  client: SavedObjectsClientContract,
  esClient: ElasticsearchClient
): Promise<BoostState> => {
  const [settings, customProfiles, customRules, dataSources] = await Promise.all([
    getSettings(client),
    getCustomProfiles(client),
    getCustomRules(client),
    getDataSources(esClient),
  ]);
  return {
    settings,
    profiles: [...BUILTIN_PROFILES, ...customProfiles],
    rules: [...customRules, ...createDefaultRules(settings.default_profiles)],
    data_sources: dataSources,
  };
};

const saveProfile = async (
  client: SavedObjectsClientContract,
  profile: BoostProfileInput,
  overwrite: boolean
) => {
  const attributes: ProfileAttributes = { kind: 'profile', ...profile };
  await client.create(BOOST_SAVED_OBJECT_TYPE, attributes, {
    id: profileId(profile.name),
    overwrite,
  });
};

const assertNotBuiltin = (name: string, action: string) => {
  if (BUILTIN_PROFILE_NAMES.includes(name)) {
    throw new BoostRequestError(400, `Built-in boost profile [${name}] cannot be ${action}.`);
  }
};

const getCustomProfile = async (
  client: SavedObjectsClientContract,
  name: string
): Promise<BoostProfileInput> => {
  try {
    const {
      attributes: { kind, ...profile },
    } = await client.get<ProfileAttributes>(BOOST_SAVED_OBJECT_TYPE, profileId(name));
    return profile;
  } catch (error) {
    if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
      throw new BoostRequestError(404, `Boost profile [${name}] not found.`);
    }
    throw error;
  }
};

export const createProfile = async (
  client: SavedObjectsClientContract,
  profile: BoostProfileInput
): Promise<void> => {
  assertNotBuiltin(profile.name, 'replaced');
  try {
    await saveProfile(client, profile, false);
  } catch (error) {
    if (SavedObjectsErrorHelpers.isConflictError(error)) {
      throw new BoostRequestError(409, `Boost profile [${profile.name}] already exists.`);
    }
    throw error;
  }
};

/** Replaces a custom profile. The name and type can't change. */
export const updateProfile = async (
  client: SavedObjectsClientContract,
  name: string,
  profile: BoostProfileInput
): Promise<void> => {
  assertNotBuiltin(name, 'edited');
  if (profile.name !== name) {
    throw new BoostRequestError(400, 'A boost profile cannot be renamed.');
  }
  const { type } = await getCustomProfile(client, name);
  if (type !== profile.type) {
    throw new BoostRequestError(400, 'A boost profile type cannot be changed.');
  }
  await saveProfile(client, profile, true);
};

/**
 * Deletes a custom profile along with the custom rules that use it. A profile that a default rule
 * uses can't be deleted, since the default rules always need a profile.
 */
export const deleteProfile = async (
  client: SavedObjectsClientContract,
  name: string
): Promise<void> => {
  assertNotBuiltin(name, 'deleted');
  await getCustomProfile(client, name);

  const [{ default_profiles: defaultProfiles }, customRules] = await Promise.all([
    getSettings(client),
    getCustomRules(client),
  ]);
  const defaultRuleName =
    defaultProfiles.indices_profile === name
      ? DEFAULT_INDICES_RULE_NAME
      : defaultProfiles.data_streams_profile === name
      ? DEFAULT_DATA_STREAMS_RULE_NAME
      : undefined;
  if (defaultRuleName) {
    throw new BoostRequestError(
      409,
      `Boost profile [${name}] is used by boost rule [${defaultRuleName}].`
    );
  }

  // Elasticsearch won't delete a profile that rules still reference, so the rules go first.
  const attachedRules = customRules.filter(
    ({ boost_profile: profileName }) => profileName === name
  );
  if (attachedRules.length > 0) {
    await client.bulkDelete(
      attachedRules.map((rule) => ({ type: BOOST_SAVED_OBJECT_TYPE, id: ruleId(rule.name) }))
    );
  }
  await client.delete(BOOST_SAVED_OBJECT_TYPE, profileId(name));
};

const assertProfileExists = async (client: SavedObjectsClientContract, name: string) => {
  if (BUILTIN_PROFILE_NAMES.includes(name)) {
    return;
  }
  try {
    await client.get(BOOST_SAVED_OBJECT_TYPE, profileId(name));
  } catch (error) {
    if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
      throw new BoostRequestError(400, `Boost rule references unknown boost profile [${name}].`);
    }
    throw error;
  }
};

/** Rejects a rule that would tie with another, which Elasticsearch rejects too. */
const assertNoRuleConflict = async (client: SavedObjectsClientContract, rule: BoostRuleInput) => {
  const [{ default_profiles: defaultProfiles }, customProfiles, customRules] = await Promise.all([
    getSettings(client),
    getCustomProfiles(client),
    getCustomRules(client),
  ]);
  const conflictingRule = findConflictingRule(
    rule,
    [...customRules, ...createDefaultRules(defaultProfiles)],
    new Map([...BUILTIN_PROFILES, ...customProfiles].map((profile) => [profile.name, profile]))
  );
  if (conflictingRule) {
    throw new BoostRequestError(
      400,
      `Boost rule [${rule.name}] conflicts with boost rule [${conflictingRule.name}]: both can ` +
        'match the same index or data stream, with the same priority and the same kind of pattern ' +
        '(exact name, wildcard or match-all), so neither applies over the other. Use a different ' +
        'priority or kind of pattern.'
    );
  }
};

const saveRule = async (
  client: SavedObjectsClientContract,
  rule: BoostRuleInput,
  overwrite: boolean
) => {
  const attributes: RuleAttributes = {
    kind: 'rule',
    ...rule,
    index_patterns: [...new Set(rule.index_patterns)],
  };
  await client.create(BOOST_SAVED_OBJECT_TYPE, attributes, { id: ruleId(rule.name), overwrite });
};

const assertCustomRuleExists = async (client: SavedObjectsClientContract, name: string) => {
  if (DEFAULT_RULE_NAMES.includes(name)) {
    throw new BoostRequestError(
      400,
      `Default boost rule [${name}] can only change its boost profile.`
    );
  }
  try {
    await client.get(BOOST_SAVED_OBJECT_TYPE, ruleId(name));
  } catch (error) {
    if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
      throw new BoostRequestError(404, `Boost rule [${name}] not found.`);
    }
    throw error;
  }
};

export const createRule = async (
  client: SavedObjectsClientContract,
  rule: BoostRuleInput
): Promise<void> => {
  if (DEFAULT_RULE_NAMES.includes(rule.name)) {
    throw new BoostRequestError(409, `Boost rule [${rule.name}] already exists.`);
  }
  await assertProfileExists(client, rule.boost_profile);
  await assertNoRuleConflict(client, rule);
  try {
    await saveRule(client, rule, false);
  } catch (error) {
    if (SavedObjectsErrorHelpers.isConflictError(error)) {
      throw new BoostRequestError(409, `Boost rule [${rule.name}] already exists.`);
    }
    throw error;
  }
};

/** Replaces a custom rule. The name can't change, pending a decision on renaming rules. */
export const updateRule = async (
  client: SavedObjectsClientContract,
  name: string,
  rule: BoostRuleInput
): Promise<void> => {
  if (rule.name !== name) {
    throw new BoostRequestError(400, 'A boost rule cannot be renamed.');
  }
  await assertCustomRuleExists(client, name);
  await assertProfileExists(client, rule.boost_profile);
  await assertNoRuleConflict(client, rule);
  await saveRule(client, rule, true);
};

export const deleteRule = async (
  client: SavedObjectsClientContract,
  name: string
): Promise<void> => {
  await assertCustomRuleExists(client, name);
  await client.delete(BOOST_SAVED_OBJECT_TYPE, ruleId(name));
};

/**
 * Sets the project's default for a profile type, which its default rule uses: an Elastic-managed or
 * custom profile of that type.
 */
export const updateDefaultRule = async (
  client: SavedObjectsClientContract,
  type: BoostProfileType,
  profileName: string
): Promise<void> => {
  const profile =
    BUILTIN_PROFILES.find(({ name }) => name === profileName) ??
    (await getCustomProfile(client, profileName));
  if (profile.type !== type) {
    throw new BoostRequestError(400, `Boost profile [${profileName}] is not a ${type} profile.`);
  }

  const { default_profiles: defaultProfiles } = await getSettings(client);
  await saveSettings(client, {
    default_profiles: { ...defaultProfiles, [DEFAULT_PROFILE_KEYS[type]]: profileName },
  });
};

/**
 * Deletes the settings and all custom profiles and rules, returning the project to its
 * out-of-the-box state.
 */
export const resetState = async (client: SavedObjectsClientContract): Promise<void> => {
  const [customProfiles, customRules] = await Promise.all([
    getCustomProfiles(client),
    getCustomRules(client),
  ]);
  const ids = [
    ...customRules.map(({ name }) => ruleId(name)),
    ...customProfiles.map(({ name }) => profileId(name)),
  ];
  if (ids.length > 0) {
    await client.bulkDelete(ids.map((id) => ({ type: BOOST_SAVED_OBJECT_TYPE, id })));
  }

  try {
    await client.delete(BOOST_SAVED_OBJECT_TYPE, BOOST_SETTINGS_SAVED_OBJECT_ID);
  } catch (error) {
    if (!SavedObjectsErrorHelpers.isNotFoundError(error)) {
      throw error;
    }
  }
};
