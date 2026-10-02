/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { SecurityPluginStart } from '@kbn/security-plugin-types-server';
import type {
  InvestigationsPrivilegesResponse,
  ReadManagePrivileges,
} from '../../../common/investigations/privileges';
import {
  ESCALATIONS_API_PRIVILEGE_MANAGE,
  ESCALATIONS_API_PRIVILEGE_READ,
} from '../../escalations/constants';
import {
  INVESTIGATIONS_API_PRIVILEGE_MANAGE,
  INVESTIGATIONS_API_PRIVILEGE_READ,
} from '../constants';

export interface InvestigationsPrivilegesDeps {
  getSecurity: () => Promise<SecurityPluginStart | undefined>;
}

/** Reports the investigation and escalation API privileges a principal holds, for the UI. */
export interface InvestigationsPrivilegesReader {
  /** What the principal may do, without throwing. All false without the security plugin. */
  getPrivileges: (request: KibanaRequest) => Promise<InvestigationsPrivilegesResponse>;
}

const NO_PRIVILEGES: ReadManagePrivileges = { read: false, manage: false };

/**
 * The feature declares the bare operation names, so they are turned into `api:` actions before
 * `checkPrivileges` sees them. Manage implies read, as it does on every read route.
 */
export const createInvestigationsPrivilegesReader = ({
  getSecurity,
}: InvestigationsPrivilegesDeps): InvestigationsPrivilegesReader => ({
  getPrivileges: async (request) => {
    const security = await getSecurity();
    if (!security) {
      return { investigations: NO_PRIVILEGES, escalations: NO_PRIVILEGES };
    }
    const toAction = (privilege: string) => security.authz.actions.api.get(privilege);
    const actions = {
      investigationsRead: toAction(INVESTIGATIONS_API_PRIVILEGE_READ),
      investigationsManage: toAction(INVESTIGATIONS_API_PRIVILEGE_MANAGE),
      escalationsRead: toAction(ESCALATIONS_API_PRIVILEGE_READ),
      escalationsManage: toAction(ESCALATIONS_API_PRIVILEGE_MANAGE),
    };
    const response = await security.authz.checkPrivilegesDynamicallyWithRequest(request)({
      kibana: Object.values(actions),
    });
    const held = new Set(
      (response.privileges?.kibana ?? [])
        .filter(({ authorized }) => authorized)
        .map(({ privilege }) => privilege)
    );
    const toReadManage = (read: string, manage: string): ReadManagePrivileges => ({
      read: held.has(read) || held.has(manage),
      manage: held.has(manage),
    });
    return {
      investigations: toReadManage(actions.investigationsRead, actions.investigationsManage),
      escalations: toReadManage(actions.escalationsRead, actions.escalationsManage),
    };
  },
});
