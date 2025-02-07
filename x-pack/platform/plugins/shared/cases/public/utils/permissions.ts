/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CasesPermissions } from '../../common';

export const isReadOnlyPermissions = (permissions: CasesPermissions) => {
  return (
    !permissions.all &&
    !permissions.create &&
    !permissions.update &&
    !permissions.delete &&
    !permissions.push &&
    !permissions.assign &&
    !permissions.createComment &&
    permissions.read
  );
};

type CasePermission = Exclude<keyof CasesPermissions, 'all'>;

export const allCasePermissions: CasePermission[] = [
  'create',
  'read',
  'update',
  'delete',
  'push',
  'assign',
];

export const getAllPermissionsExceptFrom = (capToExclude: CasePermission): CasePermission[] =>
  allCasePermissions.filter((permission) => permission !== capToExclude) as CasePermission[];
