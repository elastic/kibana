/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { load } from 'js-yaml';

import semverGte from 'semver/functions/gte';
import semverLte from 'semver/functions/lte';

export enum ChangeType {
  Enhancement = 'enhancement',
  BreakingChange = 'breaking-change',
  BugFix = 'bugfix',
}

interface Change<T extends ChangeType = ChangeType> {
  description: string;
  link: string;
  type: T;
}

export interface ChangelogEntry<T extends ChangeType = ChangeType> {
  version: string;
  changes: Array<Change<T>>;
}

export type Changelog = ChangelogEntry[];

export type BreakingChangesLog = Array<ChangelogEntry<ChangeType.BreakingChange>>;

export const formatChangelog = (parsedChangelog: Changelog) => {
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
  const parsedChangelog: Changelog = changelogText ? load(changelogText) : [];

  if (!currentVersion) return parsedChangelog.filter((e) => semverLte(e.version, latestVersion));

  return parsedChangelog.filter(
    (e) => semverLte(e.version, latestVersion) && semverGte(e.version, currentVersion)
  );
};

export const getBreakingChanges = (changelog: Changelog): BreakingChangesLog => {
  return changelog.reduce<BreakingChangesLog>((acc, entry) => {
    const breakingChanges = entry.changes.filter(
      (change): change is Change<ChangeType.BreakingChange> => {
        return change.type === ChangeType.BreakingChange;
      }
    );

    if (breakingChanges.length > 0) {
      return [...acc, { ...entry, changes: breakingChanges }];
    }

    return acc;
  }, []);
};
