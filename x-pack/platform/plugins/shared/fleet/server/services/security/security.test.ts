/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deepFreeze } from '@kbn/std';
import type { SecurityPluginStart, CheckPrivilegesDynamically } from '@kbn/security-plugin/server';

import { securityServiceMock, type SecurityStartMock } from '@kbn/core-security-server-mocks';

import { appContextService } from '../app_context';
import type { FleetAuthz } from '../../../common';

import { calculateRouteAuthz, getAuthzFromRequest } from './security';

jest.mock('../app_context');

describe('When using calculateRouteAuthz()', () => {
  const fleetAuthz = deepFreeze({
    fleet: {
      all: false,
      setup: false,
      readEnrollmentTokens: false,
      allAgentPolicies: false,
      readAgentPolicies: false,
      readAgents: false,
      allAgents: false,
      readSettings: false,
      allSettings: false,
      addAgents: false,
      addFleetServers: false,
      generateAgentReports: false,
    },
    integrations: {
      all: false,
      readPackageInfo: false,
      readInstalledPackages: false,
      installPackages: false,
      upgradePackages: false,
      removePackages: false,
      uploadPackages: false,
      readPackageSettings: false,
      writePackageSettings: false,
      readIntegrationPolicies: false,
      writeIntegrationPolicies: false,
    },
    packagePrivileges: {
      endpoint: {
        actions: {
          writeEndpointList: {
            executePackageAction: false,
          },
          readEndpointList: {
            executePackageAction: false,
          },
          writeTrustedApplications: {
            executePackageAction: false,
          },
          readTrustedApplications: {
            executePackageAction: false,
          },
          writeHostIsolationExceptions: {
            executePackageAction: false,
          },
          readHostIsolationExceptions: {
            executePackageAction: false,
          },
          writeBlocklist: {
            executePackageAction: false,
          },
          readBlocklist: {
            executePackageAction: false,
          },
          writeEventFilters: {
            executePackageAction: false,
          },
          readEventFilters: {
            executePackageAction: false,
          },
          writePolicyManagement: {
            executePackageAction: false,
          },
          readPolicyManagement: {
            executePackageAction: false,
          },
          writeActionsLogManagement: {
            executePackageAction: false,
          },
          readActionsLogManagement: {
            executePackageAction: false,
          },
          writeHostIsolation: {
            executePackageAction: false,
          },
          writeProcessOperations: {
            executePackageAction: false,
          },
          writeFileOperations: {
            executePackageAction: false,
          },
          writeExecuteOperations: {
            executePackageAction: false,
          },
        },
      },

      someOtherPackage: {
        actions: {
          readSomeThing: {
            executePackageAction: false,
          },
        },
      },
    },
  });

  const getFleetAuthzMock = (authz: FleetAuthz = fleetAuthz) => authz;

  describe('with ANY object defined', () => {
    it('should grant access if `any` are true', () => {
      expect(
        calculateRouteAuthz(
          getFleetAuthzMock({
            ...fleetAuthz,
            packagePrivileges: {
              ...fleetAuthz.packagePrivileges,
              endpoint: {
                ...fleetAuthz.packagePrivileges.endpoint,
                actions: {
                  ...fleetAuthz.packagePrivileges.endpoint.actions,
                  readPolicyManagement: {
                    executePackageAction: true,
                  },
                },
              },
            },
          }),
          {
            any: {
              integrations: {
                readPackageInfo: true,
                removePackages: true,
              },
              packagePrivileges: {
                endpoint: {
                  actions: {
                    readPolicyManagement: {
                      executePackageAction: true,
                    },
                    readBlocklist: {
                      executePackageAction: true,
                    },
                  },
                },
              },
            },
          }
        )
      ).toEqual({
        granted: true,
        grantedByFleetPrivileges: false,
        scopeDataToPackages: ['endpoint'],
      });
    });

    it('should deny access if `any` are false', () => {
      expect(
        calculateRouteAuthz(getFleetAuthzMock(), {
          any: {
            integrations: {
              readPackageInfo: true,
              removePackages: true,
            },
            packagePrivileges: {
              endpoint: {
                actions: {
                  readPolicyManagement: {
                    executePackageAction: true,
                  },
                  readBlocklist: {
                    executePackageAction: true,
                  },
                },
              },
            },
          },
        })
      ).toEqual({
        granted: false,
        grantedByFleetPrivileges: false,
        scopeDataToPackages: undefined,
      });
    });
  });

  describe('with ALL object defined', () => {
    it('should grant access if `all` are true', () => {
      expect(
        calculateRouteAuthz(
          getFleetAuthzMock({
            ...fleetAuthz,
            integrations: {
              ...fleetAuthz.integrations,
              readPackageInfo: true,
              removePackages: true,
            },
            packagePrivileges: {
              ...fleetAuthz.packagePrivileges,
              endpoint: {
                ...fleetAuthz.packagePrivileges.endpoint,
                actions: {
                  ...fleetAuthz.packagePrivileges.endpoint.actions,
                  readPolicyManagement: {
                    executePackageAction: true,
                  },
                  readBlocklist: {
                    executePackageAction: true,
                  },
                },
              },
            },
          }),
          {
            all: {
              integrations: {
                readPackageInfo: true,
                removePackages: true,
              },
              packagePrivileges: {
                endpoint: {
                  actions: {
                    readPolicyManagement: {
                      executePackageAction: true,
                    },
                    readBlocklist: {
                      executePackageAction: true,
                    },
                  },
                },
              },
            },
          }
        )
      ).toEqual({ granted: true, grantedByFleetPrivileges: true, scopeDataToPackages: undefined });
    });

    it('should deny access if not `all` are true', () => {
      expect(
        calculateRouteAuthz(
          getFleetAuthzMock({
            ...fleetAuthz,
            packagePrivileges: {
              ...fleetAuthz.packagePrivileges,
              endpoint: {
                ...fleetAuthz.packagePrivileges.endpoint,
                actions: {
                  ...fleetAuthz.packagePrivileges.endpoint.actions,
                  readPolicyManagement: {
                    executePackageAction: true,
                  },
                },
              },
            },
          }),
          {
            all: {
              integrations: {
                readPackageInfo: true,
                removePackages: true,
              },
              packagePrivileges: {
                endpoint: {
                  actions: {
                    readPolicyManagement: {
                      executePackageAction: true,
                    },
                    readBlocklist: {
                      executePackageAction: true,
                    },
                  },
                },
              },
            },
          }
        )
      ).toEqual({
        granted: false,
        grantedByFleetPrivileges: false,
        scopeDataToPackages: undefined,
      });
    });
  });

  describe('with ALL and ANY', () => {
    it('should grant access if `all` are true', () => {
      expect(
        calculateRouteAuthz(
          getFleetAuthzMock({
            ...fleetAuthz,
            integrations: {
              ...fleetAuthz.integrations,
              readPackageInfo: true,
              removePackages: true,
            },
            packagePrivileges: {
              ...fleetAuthz.packagePrivileges,
              endpoint: {
                ...fleetAuthz.packagePrivileges.endpoint,
                actions: {
                  ...fleetAuthz.packagePrivileges.endpoint.actions,
                  readPolicyManagement: {
                    executePackageAction: true,
                  },
                  readBlocklist: {
                    executePackageAction: true,
                  },
                },
              },
            },
          }),
          {
            all: {
              integrations: {
                readPackageInfo: true,
                removePackages: true,
              },
              packagePrivileges: {
                endpoint: {
                  actions: {
                    readPolicyManagement: {
                      executePackageAction: true,
                    },
                    readBlocklist: {
                      executePackageAction: true,
                    },
                  },
                },
              },
            },
          }
        )
      ).toEqual({ granted: true, grantedByFleetPrivileges: true, scopeDataToPackages: undefined });
    });

    it('should grant access if all OR any are true', () => {
      expect(
        calculateRouteAuthz(
          getFleetAuthzMock({
            ...fleetAuthz,
            integrations: {
              ...fleetAuthz.integrations,
              readPackageInfo: true,
              removePackages: true,
            },
            packagePrivileges: {
              ...fleetAuthz.packagePrivileges,
              endpoint: {
                ...fleetAuthz.packagePrivileges.endpoint,
                actions: {
                  ...fleetAuthz.packagePrivileges.endpoint.actions,
                  readPolicyManagement: {
                    executePackageAction: true,
                  },
                },
              },
            },
          }),
          {
            all: {
              integrations: {
                readPackageInfo: true,
                removePackages: true,
              },
            },
            any: {
              packagePrivileges: {
                endpoint: {
                  actions: {
                    readPolicyManagement: {
                      executePackageAction: true,
                    },
                    readBlocklist: {
                      executePackageAction: true,
                    },
                  },
                },
              },
            },
          }
        )
      ).toEqual({ granted: true, grantedByFleetPrivileges: true, scopeDataToPackages: undefined });
    });

    it('should grant access if `all` are not true but `any` are true ', () => {
      expect(
        calculateRouteAuthz(
          getFleetAuthzMock({
            ...fleetAuthz,
            integrations: {
              ...fleetAuthz.integrations,
              readPackageInfo: true,
            },
            packagePrivileges: {
              ...fleetAuthz.packagePrivileges,
              endpoint: {
                ...fleetAuthz.packagePrivileges.endpoint,
                actions: {
                  ...fleetAuthz.packagePrivileges.endpoint.actions,
                  readPolicyManagement: {
                    executePackageAction: true,
                  },
                },
              },

              someOtherPackage: {
                actions: {
                  readSomeThing: {
                    executePackageAction: true,
                  },
                },
              },
            },
          }),
          {
            all: {
              integrations: {
                readPackageInfo: true,
                removePackages: true,
              },
            },
            any: {
              packagePrivileges: {
                endpoint: {
                  actions: {
                    readPolicyManagement: {
                      executePackageAction: true,
                    },
                    readBlocklist: {
                      executePackageAction: true,
                    },
                  },
                },
                someOtherPackage: {
                  actions: {
                    readSomeThing: {
                      executePackageAction: true,
                    },
                  },
                },
              },
            },
          }
        )
      ).toEqual({
        granted: true,
        grantedByFleetPrivileges: false,
        scopeDataToPackages: ['endpoint', 'someOtherPackage'],
      });
    });

    it('should grant access if `all` are true but `any` are not true ', () => {
      expect(
        calculateRouteAuthz(
          getFleetAuthzMock({
            ...fleetAuthz,
            integrations: {
              ...fleetAuthz.integrations,
              readPackageInfo: true,
              removePackages: true,
            },
          }),
          {
            all: {
              integrations: {
                readPackageInfo: true,
                removePackages: true,
              },
            },
            any: {
              packagePrivileges: {
                endpoint: {
                  actions: {
                    readPolicyManagement: {
                      executePackageAction: true,
                    },
                    readBlocklist: {
                      executePackageAction: true,
                    },
                  },
                },
              },
            },
          }
        )
      ).toEqual({ granted: true, grantedByFleetPrivileges: true, scopeDataToPackages: undefined });
    });
  });

  describe('and access is granted based on package privileges', () => {
    it('should exclude package names for which there is no access allowed', () => {
      expect(
        calculateRouteAuthz(
          getFleetAuthzMock({
            ...fleetAuthz,
            packagePrivileges: {
              ...fleetAuthz.packagePrivileges,
              endpoint: {
                ...fleetAuthz.packagePrivileges.endpoint,
                actions: {
                  ...fleetAuthz.packagePrivileges.endpoint.actions,
                  readPolicyManagement: {
                    executePackageAction: true,
                  },
                },
              },
            },
          }),
          {
            all: {
              integrations: {
                readPackageInfo: true,
                removePackages: true,
              },
            },
            any: {
              packagePrivileges: {
                endpoint: {
                  actions: {
                    readPolicyManagement: {
                      executePackageAction: true,
                    },
                    readBlocklist: {
                      executePackageAction: true,
                    },
                  },
                },
                // This package Authz is not allowed, so it should not be listed in `scopeDataToPackages`
                someOtherPackage: {
                  actions: {
                    readSomeThing: {
                      executePackageAction: true,
                    },
                  },
                },
              },
            },
          }
        )
      ).toEqual({
        granted: true,
        grantedByFleetPrivileges: false,
        scopeDataToPackages: ['endpoint'],
      });
    });
  });
});

describe('getAuthzFromRequest', () => {
  let mockSecurityCore: SecurityStartMock;
  let mockSecurity: jest.MockedObjectDeep<SecurityPluginStart>;
  let checkPrivileges: jest.MockedFn<CheckPrivilegesDynamically>;
  beforeEach(() => {
    checkPrivileges = jest.fn();
    mockSecurityCore = securityServiceMock.createStart();
    mockSecurity = {
      authz: {
        checkPrivilegesDynamicallyWithRequest: jest.fn().mockReturnValue(checkPrivileges),
        actions: {
          ui: {
            get: (s: string) => `ui:${s}`,
          },
          api: {
            get: (s: string) => `api:${s}`,
          },
        },
        mode: {
          useRbacForRequest: jest.fn(),
        },
      },
    } as unknown as jest.MockedObjectDeep<SecurityPluginStart>;

    jest.mocked(appContextService.getSecurityCore).mockReturnValue(mockSecurityCore);
    jest.mocked(appContextService.getSecurity).mockReturnValue(mockSecurity);
    jest.mocked(appContextService.getSecurityLicense).mockReturnValue({
      isEnabled: () => true,
    } as any);
  });
  it('should not authorize access if RBAC is not enabled', async () => {
    mockSecurity.authz.mode.useRbacForRequest.mockReturnValue(false);
    const res = await getAuthzFromRequest({} as any);
    for (const val of Object.values(res.fleet)) {
      expect(val).toBe(false);
    }
    for (const val of Object.values(res.integrations)) {
      expect(val).toBe(false);
    }
  });
  describe('Fleet readAgents', () => {
    beforeEach(() => {
      mockSecurity.authz.mode.useRbacForRequest.mockReturnValue(true);
    });
    it('should authorize Fleet:All', async () => {
      checkPrivileges.mockResolvedValue({
        privileges: {
          kibana: [
            {
              resource: 'default',
              privilege: 'api:fleet-all',
              authorized: true,
            },
            {
              resource: 'default',
              privilege: 'api:fleet-agents-read',
              authorized: true,
            },
          ],
          elasticsearch: {} as any,
        },
        hasAllRequested: false,
        username: 'test',
      });
      const res = await getAuthzFromRequest({} as any);
      expect(res.fleet.readAgents).toBe(true);
    });

    it('should authorize Fleet:Read', async () => {
      checkPrivileges.mockResolvedValue({
        privileges: {
          kibana: [
            {
              resource: 'default',
              privilege: 'api:fleet-read',
              authorized: true,
            },
            {
              resource: 'default',
              privilege: 'api:fleet-agents-read',
              authorized: true,
            },
          ],
          elasticsearch: {} as any,
        },
        hasAllRequested: false,
        username: 'test',
      });
      const res = await getAuthzFromRequest({} as any);
      expect(res.fleet.readAgents).toBe(true);
    });

    it('should authorize Fleet:Agents:Read', async () => {
      checkPrivileges.mockResolvedValue({
        privileges: {
          kibana: [
            {
              resource: 'default',
              privilege: 'api:fleet-agents-read',
              authorized: true,
            },
          ],
          elasticsearch: {} as any,
        },
        hasAllRequested: false,
        username: 'test',
      });
      const res = await getAuthzFromRequest({} as any);
      expect(res.fleet.readAgents).toBe(true);
    });

    it('should authorize Fleet:Agents:All', async () => {
      checkPrivileges.mockResolvedValue({
        privileges: {
          kibana: [
            {
              resource: 'default',
              privilege: 'api:fleet-agents-all',
              authorized: true,
            },
          ],
          elasticsearch: {} as any,
        },
        hasAllRequested: false,
        username: 'test',
      });
      const res = await getAuthzFromRequest({} as any);
      expect(res.fleet.readAgents).toBe(true);
    });

    it('without kibana privilege it should not authorize Fleet Read', async () => {
      checkPrivileges.mockResolvedValue({
        privileges: {
          kibana: [],
          elasticsearch: {} as any,
        },
        hasAllRequested: false,
        username: 'test',
      });
      const res = await getAuthzFromRequest({} as any);
      expect(res.fleet.readAgents).toBe(false);
    });
  });

  describe('Fleet allAgents', () => {
    beforeEach(() => {
      mockSecurity.authz.mode.useRbacForRequest.mockReturnValue(true);
    });
    it('should authorize Fleet:All', async () => {
      checkPrivileges.mockResolvedValue({
        privileges: {
          kibana: [
            {
              resource: 'default',
              privilege: 'api:fleet-agents-all',
              authorized: true,
            },
          ],
          elasticsearch: {} as any,
        },
        hasAllRequested: true,
        username: 'test',
      });
      const res = await getAuthzFromRequest({} as any);
      expect(res.fleet.allAgents).toBe(true);
    });

    it('should not authorize Fleet:Read', async () => {
      checkPrivileges.mockResolvedValue({
        privileges: {
          kibana: [
            {
              resource: 'default',
              privilege: 'api:fleet-read',
              authorized: true,
            },
          ],
          elasticsearch: {} as any,
        },
        hasAllRequested: false,
        username: 'test',
      });
      const res = await getAuthzFromRequest({} as any);
      expect(res.fleet.allAgents).toBe(false);
    });

    it('should not authorize Fleet:Agents:Read', async () => {
      checkPrivileges.mockResolvedValue({
        privileges: {
          kibana: [
            {
              resource: 'default',
              privilege: 'api:fleet-agents-read',
              authorized: false,
            },
          ],
          elasticsearch: {} as any,
        },
        hasAllRequested: false,
        username: 'test',
      });
      const res = await getAuthzFromRequest({} as any);
      expect(res.fleet.allAgents).toBe(false);
    });

    it('should authorize Fleet:Agents:All', async () => {
      checkPrivileges.mockResolvedValue({
        privileges: {
          kibana: [
            {
              resource: 'default',
              privilege: 'api:fleet-agents-all',
              authorized: true,
            },
          ],
          elasticsearch: {} as any,
        },
        hasAllRequested: false,
        username: 'test',
      });
      const res = await getAuthzFromRequest({} as any);
      expect(res.fleet.allAgents).toBe(true);
    });
  });

  describe('Fleet readSettings', () => {
    beforeEach(() => {
      mockSecurity.authz.mode.useRbacForRequest.mockReturnValue(true);
    });
    it('should authorize Fleet:All', async () => {
      checkPrivileges.mockResolvedValue({
        privileges: {
          kibana: [
            {
              resource: 'default',
              privilege: 'api:fleet-all',
              authorized: true,
            },
            {
              resource: 'default',
              privilege: 'api:fleet-settings-read',
              authorized: true,
            },
          ],
          elasticsearch: {} as any,
        },
        hasAllRequested: false,
        username: 'test',
      });
      const res = await getAuthzFromRequest({} as any);
      expect(res.fleet.readSettings).toBe(true);
    });

    it('should authorize Fleet:Read', async () => {
      checkPrivileges.mockResolvedValue({
        privileges: {
          kibana: [
            {
              resource: 'default',
              privilege: 'api:fleet-read',
              authorized: true,
            },
            {
              resource: 'default',
              privilege: 'api:fleet-settings-read',
              authorized: true,
            },
          ],
          elasticsearch: {} as any,
        },
        hasAllRequested: false,
        username: 'test',
      });
      const res = await getAuthzFromRequest({} as any);
      expect(res.fleet.readSettings).toBe(true);
    });

    it('should authorize Fleet:Settings:Read', async () => {
      checkPrivileges.mockResolvedValue({
        privileges: {
          kibana: [
            {
              resource: 'default',
              privilege: 'api:fleet-settings-read',
              authorized: true,
            },
          ],
          elasticsearch: {} as any,
        },
        hasAllRequested: false,
        username: 'test',
      });
      const res = await getAuthzFromRequest({} as any);
      expect(res.fleet.readSettings).toBe(true);
    });

    it('should authorize Fleet:Settings:All', async () => {
      checkPrivileges.mockResolvedValue({
        privileges: {
          kibana: [
            {
              resource: 'default',
              privilege: 'api:fleet-settings-all',
              authorized: true,
            },
          ],
          elasticsearch: {} as any,
        },
        hasAllRequested: false,
        username: 'test',
      });
      const res = await getAuthzFromRequest({} as any);
      expect(res.fleet.readSettings).toBe(true);
    });

    it('without kibana privilege it should not authorize Fleet Read', async () => {
      checkPrivileges.mockResolvedValue({
        privileges: {
          kibana: [],
          elasticsearch: {} as any,
        },
        hasAllRequested: false,
        username: 'test',
      });
      const res = await getAuthzFromRequest({} as any);
      expect(res.fleet.readAgents).toBe(false);
    });
  });

  describe('Fleet addFleetServer', () => {
    beforeEach(() => {
      mockSecurity.authz.mode.useRbacForRequest.mockReturnValue(true);
    });
    it('should authorize user with Fleet:Agents:All Fleet:AgentsPolicies:All Fleet:Settings:All', async () => {
      checkPrivileges.mockResolvedValue({
        privileges: {
          kibana: [
            {
              resource: 'default',
              privilege: 'api:fleet-agents-all',
              authorized: true,
            },
            {
              resource: 'default',
              privilege: 'api:fleet-agent-policies-all',
              authorized: true,
            },
            {
              resource: 'default',
              privilege: 'api:fleet-settings-all',
              authorized: true,
            },
          ],
          elasticsearch: {} as any,
        },
        hasAllRequested: true,
        username: 'test',
      });
      const res = await getAuthzFromRequest({} as any);
      expect(res.fleet.addFleetServers).toBe(true);
    });

    it('should not authorize user with only Fleet:Agents:All', async () => {
      checkPrivileges.mockResolvedValue({
        privileges: {
          kibana: [
            {
              resource: 'default',
              privilege: 'api:fleet-agents-all',
              authorized: true,
            },
          ],
          elasticsearch: {} as any,
        },
        hasAllRequested: true,
        username: 'test',
      });
      const res = await getAuthzFromRequest({} as any);
      expect(res.fleet.addFleetServers).toBe(false);
    });
  });
  describe('Fleet generateAgentReports', () => {
    beforeEach(() => {
      mockSecurity.authz.mode.useRbacForRequest.mockReturnValue(true);
    });
    it('should authorize with Fleet:GenerateReports and Fleet:Agents:Read', async () => {
      checkPrivileges.mockResolvedValue({
        privileges: {
          kibana: [
            {
              resource: 'default',
              privilege: 'api:fleet-generate-report',
              authorized: true,
            },
            {
              resource: 'default',
              privilege: 'api:fleet-agents-read',
              authorized: true,
            },
          ],
          elasticsearch: {} as any,
        },
        hasAllRequested: false,
        username: 'test',
      });
      const res = await getAuthzFromRequest({} as any);
      expect(res.fleet.generateAgentReports).toBe(true);
    });
    it('should authorize with Fleet:GenerateReports and Fleet:Agents:All', async () => {
      checkPrivileges.mockResolvedValue({
        privileges: {
          kibana: [
            {
              resource: 'default',
              privilege: 'api:fleet-generate-report',
              authorized: true,
            },
            {
              resource: 'default',
              privilege: 'api:fleet-agents-all',
              authorized: true,
            },
          ],
          elasticsearch: {} as any,
        },
        hasAllRequested: false,
        username: 'test',
      });
      const res = await getAuthzFromRequest({} as any);
      expect(res.fleet.generateAgentReports).toBe(true);
    });
    it('should not authorize without Fleet:GenerateReports', async () => {
      checkPrivileges.mockResolvedValue({
        privileges: {
          kibana: [
            {
              resource: 'default',
              privilege: 'api:fleet-agents-all',
              authorized: true,
            },
            {
              resource: 'default',
              privilege: 'api:fleet-agents-read',
              authorized: true,
            },
          ],
          elasticsearch: {} as any,
        },
        hasAllRequested: false,
        username: 'test',
      });
      const res = await getAuthzFromRequest({} as any);
      expect(res.fleet.generateAgentReports).toBe(false);
    });
    it('should not authorize with only Fleet:GenerateReports', async () => {
      checkPrivileges.mockResolvedValue({
        privileges: {
          kibana: [
            {
              resource: 'default',
              privilege: 'api:fleet-generate-report',
              authorized: true,
            },
          ],
          elasticsearch: {} as any,
        },
        hasAllRequested: false,
        username: 'test',
      });
      const res = await getAuthzFromRequest({} as any);
      expect(res.fleet.generateAgentReports).toBe(false);
    });
  });
});
