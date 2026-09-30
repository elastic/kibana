/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import {
  getAlertingPrivilegeDisplayName,
  type AlertingV2Feature,
  type WritableAlertingV2Feature,
} from '../../../common/feature_privileges';
import type { PrivilegeChecker } from '../../lib/services/privilege_checker/privilege_checker';

const DEFAULT_ADVICE = 'Ask an administrator to grant this privilege.';

export interface UnauthorizedToolResult {
  results: Array<{
    type: ToolResultType.error;
    data: {
      message: string;
      metadata: { missingPrivileges: string[] };
    };
  }>;
}

type EnsureToolPrivilegeParams = {
  privilegeChecker: PrivilegeChecker;
  action: string;
  advice?: string;
} & (
  | { feature: AlertingV2Feature; level: 'read' }
  | { feature: WritableAlertingV2Feature; level: 'all' }
);

export const createUnauthorizedToolResult = ({
  action,
  missingPrivileges,
  advice = DEFAULT_ADVICE,
}: {
  action: string;
  missingPrivileges: string[];
  advice?: string;
}): UnauthorizedToolResult => {
  const privilegeList = missingPrivileges.join(', ');
  const privilegeLabel =
    missingPrivileges.length === 1 ? 'Missing Kibana privilege' : 'Missing Kibana privileges';

  return {
    results: [
      {
        type: ToolResultType.error,
        data: {
          message: `Unauthorized to ${action}. ${privilegeLabel}: ${privilegeList}. ${advice}`,
          metadata: { missingPrivileges },
        },
      },
    ],
  };
};

export const ensureToolPrivilege = async ({
  privilegeChecker,
  feature,
  level,
  action,
  advice,
}: EnsureToolPrivilegeParams): Promise<UnauthorizedToolResult | undefined> => {
  const authorized =
    level === 'read'
      ? await privilegeChecker.canRead(feature)
      : await privilegeChecker.canWrite(feature);

  if (authorized) {
    return undefined;
  }

  return createUnauthorizedToolResult({
    action,
    missingPrivileges: [getAlertingPrivilegeDisplayName(feature, level)],
    advice,
  });
};
