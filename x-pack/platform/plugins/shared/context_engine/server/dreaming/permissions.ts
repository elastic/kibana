/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';
import { shortHash } from './ids';

export interface KiPrivilegeGroup {
  space: string;
  name?: string[];
  count?: number;
}

export interface KiPermissions {
  kibana?: { privileges?: KiPrivilegeGroup[] };
}

const ANY_SPACE = '*';

const privilegesOf = (permissions: KiPermissions | undefined): KiPrivilegeGroup[] =>
  permissions?.kibana?.privileges ?? [];

const groupFor = (groups: KiPrivilegeGroup[], spaceId: string): KiPrivilegeGroup | undefined =>
  groups.find(({ space }) => space === spaceId) ?? groups.find(({ space }) => space === ANY_SPACE);

/** Whether a KI is visible in a space, as the AI index space filter decides it. */
export const isVisibleInSpace = (
  permissions: KiPermissions | undefined,
  spaceId: string
): boolean => {
  const groups = privilegesOf(permissions);
  return groups.length === 0 || groupFor(groups, spaceId) !== undefined;
};

const restrictedOrUndefined = (permissions: KiPermissions | undefined): KiPermissions | undefined =>
  privilegesOf(permissions).length > 0 ? permissions : undefined;

/** Whether two KIs have the same permissions, counting no privileges as open. */
export const samePermissions = (
  a: KiPermissions | undefined,
  b: KiPermissions | undefined
): boolean => isEqual(restrictedOrUndefined(a), restrictedOrUndefined(b));

/**
 * The permissions of a KI built from others, all visible in `spaceId`: theirs when they all have
 * the same ones; otherwise visible only in that space, to whoever can see every restricted one
 * there. Undefined when none is restricted.
 */
export const derivedPermissions = (
  sources: ReadonlyArray<KiPermissions | undefined>,
  spaceId: string
): KiPermissions | undefined => {
  const [first] = sources;
  if (sources.every((permissions) => samePermissions(permissions, first))) {
    return restrictedOrUndefined(first);
  }
  const restricted = sources.map(privilegesOf).filter((groups) => groups.length > 0);
  if (restricted.length === 0) {
    return undefined;
  }
  const names = [...new Set(restricted.flatMap((groups) => groupFor(groups, spaceId)?.name ?? []))];
  return { kibana: { privileges: [{ space: spaceId, name: names, count: names.length }] } };
};

const canonicalPrivileges = (groups: KiPrivilegeGroup[]): string =>
  groups
    .map(({ space, name, count }) => JSON.stringify([space, [...(name ?? [])].sort(), count]))
    .sort()
    .join('\u0000');

/** A short key for who can see a set of memories; undefined when none is restricted. */
export const audienceKeyOf = (
  sources: ReadonlyArray<KiPermissions | undefined>
): string | undefined => {
  const restricted = [
    ...new Set(
      sources
        .map(privilegesOf)
        .filter((groups) => groups.length > 0)
        .map(canonicalPrivileges)
    ),
  ];
  return restricted.length > 0 ? shortHash(...restricted.sort()) : undefined;
};
