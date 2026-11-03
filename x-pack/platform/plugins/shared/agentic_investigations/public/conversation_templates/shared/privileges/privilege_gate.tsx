/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useCanManageInvestigations } from '../../../investigations/hooks/use_can_manage_investigations';
import {
  useCanManageEscalations,
  useCanReadEscalations,
} from '../../../escalations/hooks/use_escalation_privileges';

/** What a flyout slot can require of the user. */
export type TemplatePrivilege = 'manageInvestigations' | 'manageEscalations' | 'readEscalations';

const PRIVILEGE_HOOKS: Readonly<Record<TemplatePrivilege, () => boolean>> = {
  manageInvestigations: useCanManageInvestigations,
  manageEscalations: useCanManageEscalations,
  readEscalations: useCanReadEscalations,
};

export type PrivilegeGateProps = React.PropsWithChildren<{ privilege: TemplatePrivilege }>;

/**
 * Renders `children` only once the user is known to hold `privilege`, and nothing until then.
 * The template slots are registered in `start`, before the privileges probe can answer, so the
 * decision is made here, at render time. `privilege` must not change for a mounted gate.
 */
export const PrivilegeGate = ({ privilege, children }: PrivilegeGateProps) => {
  const useIsAllowed = PRIVILEGE_HOOKS[privilege];
  const isAllowed = useIsAllowed();
  return isAllowed ? <>{children}</> : null;
};
