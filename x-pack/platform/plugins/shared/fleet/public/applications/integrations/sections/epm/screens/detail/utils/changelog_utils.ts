/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { load } from 'js-yaml';

import semverGte from 'semver/functions/gte';
import semverLte from 'semver/functions/lte';

enum ChangelogChangeType {
  Enhancement = 'enhancement',
  BreakingChange = 'breaking-change',
  BugFix = 'bugfix',
}

export interface ChangelogChange {
  description: string;
  link: string;
  type: ChangelogChangeType;
}

export interface ChangelogEntry {
  version: string;
  changes: ChangelogChange[];
}

export const formatChangelog = (parsedChangelog: ChangelogEntry[]) => {
  if (!parsedChangelog) return '';

  return parsedChangelog.reduce((acc, val) => {
    acc += `Version: ${val.version}\nChanges:\n  Type: ${val.changes[0].type}\n  Description: ${val.changes[0].description}\n  Link: ${val.changes[0].link}\n\n`;
    return acc;
  }, '');
};

export const parseYamlChangelog = (
  changelogText: string | null | undefined,
  latestVersion: string,
  currentVersion?: string
) => {
  const parsedChangelog: ChangelogEntry[] = changelogText ? load(changelogText) : [];

  if (!currentVersion) return parsedChangelog.filter((e) => semverLte(e.version, latestVersion));

  return parsedChangelog.filter(
    (e) => semverLte(e.version, latestVersion) && semverGte(e.version, currentVersion)
  );
};

export const getBreakingChanges = (changelog: ChangelogEntry[]) => {
  return changelog.reduce<ChangelogEntry[]>((acc, entry) => {
    const breakingChanges = entry.changes.filter(
      (change) => change.type === ChangelogChangeType.BreakingChange
    );

    if (breakingChanges.length > 0) {
      return [...acc, { ...entry, changes: breakingChanges }];
    }

    return acc;
  }, []);
};
