/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const RULES_PATH = '/rules';
export const PROFILES_PATH = '/profiles';
export const PROFILE_PARAM = 'profile';

// `history` decodes `%25` on every parse, so `%` and `~` are escaped as `~25` and `~7E` first.
const encodeName = (name: string): string =>
  encodeURIComponent(name.replace(/[~%]/g, (char) => (char === '%' ? '~25' : '~7E')));

export const decodeName = (value: string): string => {
  let decoded = value;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    // Already decoded.
  }
  return decoded.replace(/~(25|7E)/g, (_, code: string) => (code === '25' ? '%' : '~'));
};

export const getRulePath = (ruleName: string): string => `${RULES_PATH}/${encodeName(ruleName)}`;

export const getProfilePath = (profileName: string): string =>
  `${PROFILES_PATH}/${encodeName(profileName)}`;

export const getRulesListLocation = (
  profileName: string
): { pathname: string; search: string } => ({
  pathname: RULES_PATH,
  search: `?${new URLSearchParams({ [PROFILE_PARAM]: profileName })}`,
});
