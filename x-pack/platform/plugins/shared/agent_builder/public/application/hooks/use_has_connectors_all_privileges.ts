/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from './use_kibana';

/**
 * Returns true if the user has access to connectors with all privileges.
 * Currently used in the Agent Builder application to determine whether to show the Gen AI Settings external links.
 *
 * @returns {boolean} True if the user has all connector privileges (show, execute, delete, save)
 */
export const useHasConnectorsAllPrivileges = () => {
  const { services } = useKibana();
  const { application } = services;

  const hasConnectorsAllPrivilege =
    application.capabilities.actions?.show === true &&
    application.capabilities.actions?.execute === true &&
    application.capabilities.actions?.delete === true &&
    application.capabilities.actions?.save === true;

  return hasConnectorsAllPrivilege;
};
