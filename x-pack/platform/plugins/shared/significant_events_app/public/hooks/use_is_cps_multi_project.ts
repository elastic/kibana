/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from './use_kibana';

/**
 * `true` when cross-project search is live and this deployment has at least one linked project.
 * Gates copy that discloses knowledge indicator generation's cross-project scope - that
 * disclosure is only meaningful once there is more than one project to talk about.
 */
export const useIsCpsMultiProject = (): boolean => {
  const {
    dependencies: {
      start: { cps },
    },
  } = useKibana();

  return cps?.cpsManager?.hasLinkedProjects() ?? false;
};
