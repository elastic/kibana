/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const REASONS = {
  view_index_metadata: 'Custom resolution rules are checked against',
  write: 'An enabled custom resolution rule links entities in',
} as const;

const ACTIONS = {
  view_index_metadata: 'creating, previewing or enabling one',
  write: 'enabling or changing one',
} as const;

export type EntityIndexPrivilege = keyof typeof REASONS;

export class MissingEntityIndexPrivilegeError extends Error {
  constructor(index: string, privilege: EntityIndexPrivilege) {
    super(
      `${REASONS[privilege]} '${index}', so ${ACTIONS[privilege]} requires the '${privilege}' index privilege there`
    );
  }
}
