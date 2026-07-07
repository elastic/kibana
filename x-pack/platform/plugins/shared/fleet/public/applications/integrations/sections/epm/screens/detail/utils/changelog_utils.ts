/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import semverGte from 'semver/functions/gte';
import semverLte from 'semver/functions/lte';

import type { ChangeLogParams } from '../settings/changelog_modal';
export type YamlParseFn = (value: string) => unknown;

export enum ChangeType {
  Enhancement = 'enhancement',
  BreakingChange = 'breaking-change',
  BugFix = 'bugfix',
}

export const formatChangelog = (parsedChangelog: ChangeLogParams[]) => {
  if (!parsedChangelog) return '';

  return parsedChangelog.reduce((acc, val) => {
    acc += `Version: ${val.version}\nChanges:\n  Type: ${val.changes[0].type}\n  Description: ${val.changes[0].description}\n  Link: ${val.changes[0].link}\n\n`;
    return acc;
  }, '');
};

// Exported for testing
export const filterYamlChangelog = (
  parse: YamlParseFn,
  changelogText: string | null | undefined,
  latestVersion: string,
  currentVersion?: string
) => {
  const parsedChangelog: ChangeLogParams[] = changelogText
    ? (parse(changelogText) as ChangeLogParams[])
    : [];

  if (!currentVersion) return parsedChangelog.filter((e) => semverLte(e.version, latestVersion));

  return parsedChangelog.filter(
    (e) => semverLte(e.version, latestVersion) && semverGte(e.version, currentVersion)
  );
};

export const getFormattedChangelog = (
  parse: YamlParseFn,
  changelogText: string | null | undefined,
  latestVersion: string,
  currentVersion?: string
) => {
  const parsed = filterYamlChangelog(parse, changelogText, latestVersion, currentVersion);
  return formatChangelog(parsed);
};
