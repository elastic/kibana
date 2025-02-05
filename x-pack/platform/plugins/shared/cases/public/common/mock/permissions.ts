/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CasesCapabilities, CasesPermissions } from '../../containers/types';

export const allCasesPermissions = () => buildCasesPermissions();
export const noCasesPermissions = () =>
  buildCasesPermissions({
    read: false,
    create: false,
    update: false,
    delete: false,
    push: false,
    connectors: false,
    settings: false,
    createComment: false,
    reopenCase: false,
    assign: false,
  });

export const readCasesPermissions = () =>
  buildCasesPermissions({
    read: true,
    create: false,
    update: false,
    delete: false,
    push: false,
    connectors: true,
    settings: false,
    createComment: false,
    reopenCase: false,
    assign: false,
  });
export const noCreateCasesPermissions = () => buildCasesPermissions({ create: false });
export const noCreateCommentCasesPermissions = () =>
  buildCasesPermissions({ createComment: false });
export const noUpdateCasesPermissions = () =>
  buildCasesPermissions({ update: false, reopenCase: false });
export const noAssignCasesPermissions = () => buildCasesPermissions({ assign: false });
export const noPushCasesPermissions = () => buildCasesPermissions({ push: false });
export const noDeleteCasesPermissions = () => buildCasesPermissions({ delete: false });
export const noReopenCasesPermissions = () => buildCasesPermissions({ reopenCase: false });
export const writeCasesPermissions = () => buildCasesPermissions({ read: false });
export const onlyCreateCommentPermissions = () =>
  buildCasesPermissions({
    read: false,
    create: false,
    update: false,
    delete: true,
    push: false,
    createComment: true,
    reopenCase: false,
    assign: false,
  });
export const onlyDeleteCasesPermission = () =>
  buildCasesPermissions({
    read: false,
    create: false,
    update: false,
    delete: true,
    push: false,
    createComment: false,
    reopenCase: false,
    assign: false,
  });
// In practice, a real life user should never have this configuration, but testing for thoroughness
export const onlyReopenCasesPermission = () =>
  buildCasesPermissions({
    read: false,
    create: false,
    update: false,
    delete: false,
    push: false,
    createComment: false,
    reopenCase: true,
    assign: false,
  });
export const noConnectorsCasePermission = () => buildCasesPermissions({ connectors: false });
export const noCasesSettingsPermission = () => buildCasesPermissions({ settings: false });
export const disabledReopenCasePermission = () => buildCasesPermissions({ reopenCase: false });

export const buildCasesPermissions = (overrides: Partial<Omit<CasesPermissions, 'all'>> = {}) => {
  const create = overrides.create ?? true;
  const read = overrides.read ?? true;
  const update = overrides.update ?? true;
  const deletePermissions = overrides.delete ?? true;
  const push = overrides.push ?? true;
  const connectors = overrides.connectors ?? true;
  const settings = overrides.settings ?? true;
  const reopenCase = overrides.reopenCase ?? true;
  const createComment = overrides.createComment ?? true;
  const assign = overrides.assign ?? true;
  const all =
    create &&
    read &&
    update &&
    deletePermissions &&
    push &&
    settings &&
    connectors &&
    reopenCase &&
    assign &&
    createComment;

  return {
    all,
    create,
    read,
    update,
    delete: deletePermissions,
    push,
    connectors,
    settings,
    reopenCase,
    createComment,
    assign,
  };
};

export const allCasesCapabilities = () => buildCasesCapabilities();
export const noCasesCapabilities = () =>
  buildCasesCapabilities({
    create_cases: false,
    read_cases: false,
    update_cases: false,
    delete_cases: false,
    push_cases: false,
    cases_connectors: false,
    cases_settings: false,
    create_comment: false,
    case_reopen: false,
    cases_assign: false,
  });
export const readCasesCapabilities = () =>
  buildCasesCapabilities({
    create_cases: false,
    update_cases: false,
    delete_cases: false,
    push_cases: false,
    cases_settings: false,
    create_comment: false,
    case_reopen: false,
    cases_assign: false,
  });
export const writeCasesCapabilities = () => {
  return buildCasesCapabilities({
    read_cases: false,
  });
};

export const buildCasesCapabilities = (overrides?: Partial<CasesCapabilities>) => {
  return {
    create_cases: overrides?.create_cases ?? true,
    read_cases: overrides?.read_cases ?? true,
    update_cases: overrides?.update_cases ?? true,
    delete_cases: overrides?.delete_cases ?? true,
    push_cases: overrides?.push_cases ?? true,
    cases_connectors: overrides?.cases_connectors ?? true,
    cases_settings: overrides?.cases_settings ?? true,
    create_comment: overrides?.create_comment ?? true,
    case_reopen: overrides?.case_reopen ?? true,
    cases_assign: overrides?.cases_assign ?? true,
  };
};
