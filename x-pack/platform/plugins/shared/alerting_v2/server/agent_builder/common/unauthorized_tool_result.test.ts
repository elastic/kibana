/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { PrivilegeChecker } from '../../lib/services/privilege_checker/privilege_checker';
import { createUnauthorizedToolResult, ensureToolPrivilege } from './unauthorized_tool_result';

describe('createUnauthorizedToolResult', () => {
  it('returns a ToolResultType.error with missingPrivileges metadata', () => {
    expect(
      createUnauthorizedToolResult({
        action: 'fetch rule for episode',
        missingPrivileges: ['Rules: Read'],
      })
    ).toEqual({
      results: [
        {
          type: ToolResultType.error,
          data: {
            message:
              'Unauthorized to fetch rule for episode. Missing Kibana privilege: Rules: Read. Ask an administrator to grant this privilege.',
            metadata: { missingPrivileges: ['Rules: Read'] },
          },
        },
      ],
    });
  });

  it('pluralizes the privilege label and supports custom advice', () => {
    expect(
      createUnauthorizedToolResult({
        action: 'compose or modify Alerting V2 rules',
        missingPrivileges: ['Rules: All', 'Alerts: Read'],
        advice:
          'Ask an administrator to grant this privilege, or continue with discovery-only if you only have Rules: Read.',
      })
    ).toEqual({
      results: [
        {
          type: ToolResultType.error,
          data: {
            message:
              'Unauthorized to compose or modify Alerting V2 rules. Missing Kibana privileges: Rules: All, Alerts: Read. Ask an administrator to grant this privilege, or continue with discovery-only if you only have Rules: Read.',
            metadata: { missingPrivileges: ['Rules: All', 'Alerts: Read'] },
          },
        },
      ],
    });
  });
});

describe('ensureToolPrivilege', () => {
  const createPrivilegeChecker = ({
    canRead = true,
    canWrite = true,
  }: {
    canRead?: boolean;
    canWrite?: boolean;
  } = {}): PrivilegeChecker =>
    ({
      canRead: jest.fn().mockResolvedValue(canRead),
      canWrite: jest.fn().mockResolvedValue(canWrite),
    } as unknown as PrivilegeChecker);

  it('returns undefined when the user is authorized', async () => {
    const privilegeChecker = createPrivilegeChecker({ canRead: true });

    await expect(
      ensureToolPrivilege({
        privilegeChecker,
        feature: 'alerts',
        level: 'read',
        action: 'refresh episode',
      })
    ).resolves.toBeUndefined();

    expect(privilegeChecker.canRead).toHaveBeenCalledWith('alerts');
  });

  it('returns an unauthorized tool result when the read check fails', async () => {
    const privilegeChecker = createPrivilegeChecker({ canRead: false });

    await expect(
      ensureToolPrivilege({
        privilegeChecker,
        feature: 'rules',
        level: 'read',
        action: 'fetch rule for episode',
      })
    ).resolves.toEqual({
      results: [
        {
          type: ToolResultType.error,
          data: {
            message:
              'Unauthorized to fetch rule for episode. Missing Kibana privilege: Rules: Read. Ask an administrator to grant this privilege.',
            metadata: { missingPrivileges: ['Rules: Read'] },
          },
        },
      ],
    });
  });

  it('checks write privileges for level all', async () => {
    const privilegeChecker = createPrivilegeChecker({ canWrite: false });

    await expect(
      ensureToolPrivilege({
        privilegeChecker,
        feature: 'rules',
        level: 'all',
        action: 'compose or modify Alerting V2 rules',
        advice:
          'Ask an administrator to grant this privilege, or continue with discovery-only if you only have Rules: Read.',
      })
    ).resolves.toEqual({
      results: [
        {
          type: ToolResultType.error,
          data: {
            message:
              'Unauthorized to compose or modify Alerting V2 rules. Missing Kibana privilege: Rules: All. Ask an administrator to grant this privilege, or continue with discovery-only if you only have Rules: Read.',
            metadata: { missingPrivileges: ['Rules: All'] },
          },
        },
      ],
    });

    expect(privilegeChecker.canWrite).toHaveBeenCalledWith('rules');
  });
});
