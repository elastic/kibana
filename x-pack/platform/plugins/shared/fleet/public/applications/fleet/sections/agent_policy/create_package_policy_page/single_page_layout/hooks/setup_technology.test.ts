/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { waitFor, renderHook, act } from '@testing-library/react';

import {
  createPackagePolicyMock,
  createPackageInfoMock,
} from '../../../../../../../../common/mocks';

import type { RegistryPolicyTemplate, PackageInfo } from '../../../../../../../../common/types';
import { SetupTechnology } from '../../../../../../../../common/types';
import { useStartServices, useConfig } from '../../../../../hooks';
import { SelectedPolicyTab } from '../../components';
import { generateNewAgentPolicyWithDefaults } from '../../../../../../../../common/services/generate_new_agent_policy';

import { isAgentlessSetupDefault, useAgentless, useSetupTechnology } from './setup_technology';

jest.mock('../../../../../services');
jest.mock('../../../../../hooks', () => ({
  ...jest.requireActual('../../../../../hooks'),
  sendGetOneAgentPolicy: jest.fn(),
  sendGetOneFleetServerHost: jest.fn().mockResolvedValue({}),
  sendGetOneOutput: jest.fn().mockResolvedValue({}),
  useStartServices: jest.fn(),
  useConfig: jest.fn(),
}));
jest.mock('../../../../../../../../common/services/generate_new_agent_policy');

type MockFn = jest.MockedFunction<any>;

describe('useAgentless', () => {
  beforeEach(() => {
    (useConfig as MockFn).mockReturnValue({
      agentless: undefined,
    } as any);
    (useStartServices as MockFn).mockReturnValue({
      cloud: {
        isServerlessEnabled: false,
        isCloudEnabled: false,
      },
    });
    jest.clearAllMocks();
  });

  it('should return isAgentlessEnabled as falsy when agentless is not enabled', () => {
    const { result } = renderHook(() => useAgentless());

    expect(result.current.isAgentlessEnabled).toBeFalsy();
  });

  it('should return isAgentlessEnabled as falsy if agentless.enabled true without cloud or serverless', () => {
    (useConfig as MockFn).mockReturnValue({
      agentless: {
        enabled: true,
      },
    } as any);

    const { result } = renderHook(() => useAgentless());

    expect(result.current.isAgentlessEnabled).toBeFalsy();
  });

  it('should return isAgentlessEnabled as truthy with isCloudEnabled', () => {
    (useConfig as MockFn).mockReturnValue({
      agentless: {
        enabled: true,
      },
    } as any);

    (useStartServices as MockFn).mockReturnValue({
      cloud: {
        isServerlessEnabled: false,
        isCloudEnabled: true,
      },
    });

    const { result } = renderHook(() => useAgentless());

    expect(result.current.isAgentlessEnabled).toBeTruthy();
  });

  it('should return isAgentlessEnabled truthy with isServerlessEnabled', () => {
    (useStartServices as MockFn).mockReturnValue({
      cloud: {
        isServerlessEnabled: true,
        isCloudEnabled: false,
      },
    });

    (useConfig as MockFn).mockReturnValue({
      agentless: {
        enabled: true,
      },
    } as any);

    const { result } = renderHook(() => useAgentless());

    expect(result.current.isAgentlessEnabled).toBeTruthy();
  });

  it('should return isAgentlessEnabled as falsy with isServerlessEnabled and without agentless config', () => {
    (useStartServices as MockFn).mockReturnValue({
      cloud: {
        isServerlessEnabled: true,
        isCloudEnabled: false,
      },
    });

    const { result } = renderHook(() => useAgentless());

    expect(result.current.isAgentlessEnabled).toBeFalsy();
  });

  it('should return isAgentlessIntegration that returns false when agentless custom integrations are not enabled, and a custom integration is provided', () => {
    (useStartServices as MockFn).mockReturnValue({
      agentless: {
        enabled: true,
        customIntegrations: {
          enabled: false,
        },
      },
    });

    const mockPackageInfo = createPackageInfoMock({ installSource: 'custom' });

    const {
      result: {
        current: { isAgentlessIntegration },
      },
    } = renderHook(() => useAgentless());

    expect(isAgentlessIntegration(mockPackageInfo)).toBe(false);
  });

  it('should return isAgentlessIntegration that returns true when agentless custom integrations are enabled, and a custom integration is provided', () => {
    (useStartServices as MockFn).mockReturnValue({
      agentless: {
        enabled: true,
        customIntegrations: {
          enabled: true,
        },
      },
    });

    const mockPackageInfo = createPackageInfoMock({ installSource: 'custom' });

    const {
      result: {
        current: { isAgentlessIntegration },
      },
    } = renderHook(() => useAgentless());

    expect(isAgentlessIntegration(mockPackageInfo)).toBe(false);
  });

  it('should return isAgentlessDefault as falsey when agentless is disabled and isDefault is true', () => {
    (useStartServices as MockFn).mockReturnValue({
      cloud: {
        isServerlessEnabled: true,
        isCloudEnabled: false,
      },
    });
    (useConfig as MockFn).mockReturnValue({
      agentless: {
        enabled: false,
        isDefault: true,
      },
    } as any);

    const { result } = renderHook(() => useAgentless());

    expect(result.current.isAgentlessDefault).toBeFalsy();
  });

  it('should return isAgentlessDefault as falsey when agentless is enabled and isDefault is false', () => {
    (useStartServices as MockFn).mockReturnValue({
      cloud: {
        isServerlessEnabled: true,
        isCloudEnabled: false,
      },
    });
    (useConfig as MockFn).mockReturnValue({
      agentless: {
        enabled: true,
        isDefault: false,
      },
    } as any);

    const { result } = renderHook(() => useAgentless());

    expect(result.current.isAgentlessDefault).toBeFalsy();
  });

  it('should return isAgentlessDefault as truthy when agentless is enabled and isDefault is true', () => {
    (useStartServices as MockFn).mockReturnValue({
      cloud: {
        isServerlessEnabled: true,
        isCloudEnabled: false,
      },
    });
    (useConfig as MockFn).mockReturnValue({
      agentless: {
        enabled: true,
        isDefault: true,
      },
    } as any);

    const { result } = renderHook(() => useAgentless());

    expect(result.current.isAgentlessDefault).toBeTruthy();
  });

  it('should return isAgentlessDefault as falsey when agentless is enabled and isDefault is true, but serverless and cloud disabled', () => {
    (useStartServices as MockFn).mockReturnValue({
      cloud: {
        isServerlessEnabled: false,
        isCloudEnabled: false,
      },
    });
    (useConfig as MockFn).mockReturnValue({
      agentless: {
        enabled: true,
        isDefault: true,
      },
    } as any);

    const { result } = renderHook(() => useAgentless());

    expect(result.current.isAgentlessDefault).toBeFalsy();
  });
});

describe('useSetupTechnology', () => {
  const setNewAgentPolicy = jest.fn();
  const updatePackagePolicyMock = jest.fn();
  const setSelectedPolicyTabMock = jest.fn();
  const newAgentPolicyMock = {
    name: 'mock_new_agent_policy',
    namespace: 'default',
    is_managed: false,
    supports_agentless: false,
    inactivity_timeout: 3600,
  };

  // const packageInfoWithoutAgentless = {
  //   policy_templates: [
  //     {
  //       name: 'cspm',
  //       title: 'Template 1',
  //       description: '',
  //       deployment_modes: {
  //         default: {
  //           enabled: true,
  //         },
  //         agentless: {
  //           enabled: false,
  //         },
  //       },
  //     },
  //   ] as RegistryPolicyTemplate[],
  // } as PackageInfo;

  // const packageInfoMock = {
  //   policy_templates: [
  //     {
  //       name: 'cspm',
  //       title: 'Template 1',
  //       description: '',
  //       deployment_modes: {
  //         default: {
  //           enabled: true,
  //         },
  //         agentless: {
  //           enabled: true,
  //           organization: 'org',
  //           division: 'div',
  //           team: 'team',
  //           resources: {
  //             requests: {
  //               memory: '256Mi',
  //               cpu: '100m',
  //             },
  //           },
  //         },
  //       },
  //     },
  //     {
  //       name: 'not-cspm',
  //       title: 'Template 2',
  //       description: '',
  //       deployment_modes: {
  //         default: {
  //           enabled: true,
  //         },
  //       },
  //     },
  //   ] as RegistryPolicyTemplate[],
  // } as PackageInfo;

  // const packageInfoWithoutResources = {
  //   policy_templates: [
  //     {
  //       name: 'cspm',
  //       title: 'Template 1',
  //       description: '',
  //       deployment_modes: {
  //         default: {
  //           enabled: true,
  //         },
  //         agentless: {
  //           enabled: true,
  //         },
  //       },
  //     },
  //     {
  //       name: 'not-cspm',
  //       title: 'Template 2',
  //       description: '',
  //       deployment_modes: {
  //         default: {
  //           enabled: true,
  //         },
  //       },
  //     },
  //   ] as RegistryPolicyTemplate[],
  // } as PackageInfo;

  const packagePolicyMock = createPackagePolicyMock();

  beforeEach(() => {
    (useConfig as MockFn).mockReturnValue({
      agentless: undefined,
    } as any);
    (useStartServices as MockFn).mockReturnValue({
      cloud: {
        isServerlessEnabled: true,
      },
    });

    (generateNewAgentPolicyWithDefaults as MockFn).mockImplementation((overrides: any) => {
      return {
        name: 'Agentless policy for endpoint-1',
        supports_agentless: true,
        inactivity_timeout: 3600,
        ...overrides,
      };
    });
    jest.clearAllMocks();
  });

  describe('default values', () => {
    it('should be agent-based when agentless is disabled', () => {
      const { result } = renderHook(() =>
        useSetupTechnology({
          setNewAgentPolicy,
          newAgentPolicy: newAgentPolicyMock,
          setSelectedPolicyTab: setSelectedPolicyTabMock,
          packagePolicy: packagePolicyMock,
          updatePackagePolicy: updatePackagePolicyMock,
        })
      );

      expect(result.current.selectedSetupTechnology).toBe(SetupTechnology.AGENT_BASED);
    });

    it('should be agent-based when agentless is enabled and integrations have a mix of deployment modes', () => {
      (useConfig as MockFn).mockReturnValue({
        agentless: {
          enabled: true,
          api: {
            url: 'https://agentless.api.url',
          },
        },
      } as any);

      const { result } = renderHook(() =>
        useSetupTechnology({
          setNewAgentPolicy,
          newAgentPolicy: newAgentPolicyMock,
          setSelectedPolicyTab: setSelectedPolicyTabMock,
          packagePolicy: packagePolicyMock,
          updatePackagePolicy: updatePackagePolicyMock,
          packageInfo: {
            policy_templates: [
              {
                name: 'template1',
                title: 'Template 1',
                deployment_modes: {
                  default: {
                    enabled: true,
                  },
                  agentless: {
                    enabled: true,
                  },
                },
              },
              {
                name: 'template2',
                title: 'Template 2',
                deployment_modes: {
                  default: {
                    enabled: true,
                  },
                  agentless: {
                    enabled: true,
                  },
                },
              },
            ],
          } as PackageInfo,
        })
      );

      expect(result.current.allowedSetupTechnologies).toStrictEqual([
        SetupTechnology.AGENTLESS,
        SetupTechnology.AGENT_BASED,
      ]);
      expect(result.current.selectedSetupTechnology).toBe(SetupTechnology.AGENT_BASED);
    });

    it('should be agentless when agentless is enabled and isDefault is true', () => {
      (useConfig as MockFn).mockReturnValue({
        agentless: {
          enabled: true,
          isDefault: true,
          api: {
            url: 'https://agentless.api.url',
          },
        },
      } as any);

      const { result } = renderHook(() =>
        useSetupTechnology({
          setNewAgentPolicy,
          newAgentPolicy: newAgentPolicyMock,
          setSelectedPolicyTab: setSelectedPolicyTabMock,
          packagePolicy: packagePolicyMock,
          updatePackagePolicy: updatePackagePolicyMock,
          packageInfo: {
            policy_templates: [
              {
                name: 'template1',
                title: 'Template 1',
                deployment_modes: {
                  default: {
                    enabled: true,
                  },
                  agentless: {
                    enabled: true,
                  },
                },
              },
              {
                name: 'template2',
                title: 'Template 2',
                deployment_modes: {
                  default: {
                    enabled: true,
                  },
                  agentless: {
                    enabled: true,
                  },
                },
              },
            ],
          } as PackageInfo,
        })
      );

      expect(result.current.allowedSetupTechnologies).toStrictEqual([
        SetupTechnology.AGENTLESS,
        SetupTechnology.AGENT_BASED,
      ]);
      expect(result.current.selectedSetupTechnology).toBe(SetupTechnology.AGENTLESS);
    });

    it('should be agent-based when agentless is enabled and selected integration is agent-based by default', () => {
      (useConfig as MockFn).mockReturnValue({
        agentless: {
          enabled: true,
          api: {
            url: 'https://agentless.api.url',
          },
        },
      } as any);

      const { result } = renderHook(() =>
        useSetupTechnology({
          setNewAgentPolicy,
          newAgentPolicy: newAgentPolicyMock,
          setSelectedPolicyTab: setSelectedPolicyTabMock,
          packagePolicy: packagePolicyMock,
          updatePackagePolicy: updatePackagePolicyMock,
          packageInfo: {
            policy_templates: [
              {
                name: 'template1',
                title: 'Template 1',
                deployment_modes: {
                  default: {
                    enabled: true,
                  },
                  agentless: {
                    enabled: true,
                  },
                },
              },
              {
                name: 'template2',
                title: 'Template 2',
                deployment_modes: {
                  default: {
                    enabled: true,
                    is_default: true,
                  },
                  agentless: {
                    enabled: true,
                  },
                },
              },
            ],
          } as PackageInfo,
          integrationToEnable: 'template2',
        })
      );

      expect(result.current.selectedSetupTechnology).toBe(SetupTechnology.AGENT_BASED);
    });

    it('should be agent-based when packageInfo has no policy templates', () => {
      (useConfig as MockFn).mockReturnValue({
        agentless: {
          enabled: true,
          api: {
            url: 'https://agentless.api.url',
          },
        },
      } as any);
      const { result } = renderHook(() =>
        useSetupTechnology({
          setNewAgentPolicy,
          newAgentPolicy: newAgentPolicyMock,
          setSelectedPolicyTab: setSelectedPolicyTabMock,
          packagePolicy: packagePolicyMock,
          updatePackagePolicy: updatePackagePolicyMock,
          packageInfo: {
            policy_templates: [] as PackageInfo['policy_templates'],
          } as PackageInfo,
        })
      );

      expect(result.current.selectedSetupTechnology).toBe(SetupTechnology.AGENT_BASED);
    });

    it('should be agentless when agentless is enabled and all integrations are only agentless', () => {
      (useConfig as MockFn).mockReturnValue({
        agentless: {
          enabled: true,
          api: {
            url: 'https://agentless.api.url',
          },
        },
      } as any);

      const { result } = renderHook(() =>
        useSetupTechnology({
          setNewAgentPolicy,
          newAgentPolicy: newAgentPolicyMock,
          setSelectedPolicyTab: setSelectedPolicyTabMock,
          packagePolicy: packagePolicyMock,
          updatePackagePolicy: updatePackagePolicyMock,
          packageInfo: {
            policy_templates: [
              {
                name: 'template1',
                title: 'Template 1',
                deployment_modes: {
                  default: {
                    enabled: false,
                  },
                  agentless: {
                    enabled: true,
                  },
                },
              },
              {
                name: 'template2',
                title: 'Template 2',
                deployment_modes: {
                  default: {
                    enabled: false,
                  },
                  agentless: {
                    enabled: true,
                  },
                },
              },
            ],
          } as PackageInfo,
        })
      );

      expect(result.current.allowedSetupTechnologies).toStrictEqual([SetupTechnology.AGENTLESS]);
      expect(result.current.selectedSetupTechnology).toBe(SetupTechnology.AGENTLESS);
    });

    it('should be agentless when agentless is enabled and selected integration is only agentless', () => {
      (useConfig as MockFn).mockReturnValue({
        agentless: {
          enabled: true,
          api: {
            url: 'https://agentless.api.url',
          },
        },
      } as any);

      const { result } = renderHook(() =>
        useSetupTechnology({
          setNewAgentPolicy,
          newAgentPolicy: newAgentPolicyMock,
          setSelectedPolicyTab: setSelectedPolicyTabMock,
          packagePolicy: packagePolicyMock,
          updatePackagePolicy: updatePackagePolicyMock,
          packageInfo: {
            policy_templates: [
              {
                name: 'template1',
                title: 'Template 1',
                deployment_modes: {
                  default: {
                    enabled: false,
                  },
                  agentless: {
                    enabled: true,
                  },
                },
              },
              {
                name: 'template2',
                title: 'Template 2',
                deployment_modes: {
                  default: {
                    enabled: true,
                  },
                  agentless: {
                    enabled: true,
                  },
                },
              },
            ],
          } as PackageInfo,
          integrationToEnable: 'template1',
        })
      );

      expect(result.current.selectedSetupTechnology).toBe(SetupTechnology.AGENTLESS);
    });

    it('should be agentless when agentless is enabled and selected integration is agentless by default', () => {
      (useConfig as MockFn).mockReturnValue({
        agentless: {
          enabled: true,
          api: {
            url: 'https://agentless.api.url',
          },
        },
      } as any);

      const { result } = renderHook(() =>
        useSetupTechnology({
          setNewAgentPolicy,
          newAgentPolicy: newAgentPolicyMock,
          setSelectedPolicyTab: setSelectedPolicyTabMock,
          packagePolicy: packagePolicyMock,
          updatePackagePolicy: updatePackagePolicyMock,
          packageInfo: {
            policy_templates: [
              {
                name: 'template1',
                title: 'Template 1',
                deployment_modes: {
                  default: {
                    enabled: true,
                  },
                  agentless: {
                    enabled: true,
                    is_default: true,
                  },
                },
              },
              {
                name: 'template2',
                title: 'Template 2',
                deployment_modes: {
                  default: {
                    enabled: true,
                  },
                  agentless: {
                    enabled: true,
                  },
                },
              },
            ],
          } as PackageInfo,
          integrationToEnable: 'template1',
        })
      );

      expect(result.current.selectedSetupTechnology).toBe(SetupTechnology.AGENTLESS);
    });
  });

  it('should set agentless setup technology if agent policy supports agentless in edit page', async () => {
    (useConfig as MockFn).mockReturnValue({
      agentless: {
        enabled: true,
        api: {
          url: 'https://agentless.api.url',
        },
      },
    } as any);
    (useStartServices as MockFn).mockReturnValue({
      cloud: {
        isCloudEnabled: true,
      },
    });
    const { result } = renderHook(() =>
      useSetupTechnology({
        setNewAgentPolicy,
        newAgentPolicy: newAgentPolicyMock,
        setSelectedPolicyTab: setSelectedPolicyTabMock,
        packagePolicy: packagePolicyMock,
        isEditPage: true,
        agentPolicies: [{ id: 'agentless-policy-id', supports_agentless: true } as any],
        updatePackagePolicy: updatePackagePolicyMock,
      })
    );

    expect(result.current.selectedSetupTechnology).toBe(SetupTechnology.AGENTLESS);
  });

  it('should create agentless policy if isCloud and agentless.enabled', async () => {
    (useConfig as MockFn).mockReturnValue({
      agentless: {
        enabled: true,
        api: {
          url: 'https://agentless.api.url',
        },
      },
    } as any);
    (useStartServices as MockFn).mockReturnValue({
      cloud: {
        isCloudEnabled: true,
      },
    });
    const { result } = renderHook(() =>
      useSetupTechnology({
        setNewAgentPolicy,
        newAgentPolicy: newAgentPolicyMock,
        setSelectedPolicyTab: setSelectedPolicyTabMock,
        packagePolicy: packagePolicyMock,
        updatePackagePolicy: updatePackagePolicyMock,
      })
    );

    act(() => {
      result.current.handleSetupTechnologyChange(SetupTechnology.AGENTLESS);
    });
    await waitFor(() => {
      expect(generateNewAgentPolicyWithDefaults).toHaveBeenCalled();
      expect(updatePackagePolicyMock).toHaveBeenCalledWith({ supports_agentless: true });
      expect(result.current.selectedSetupTechnology).toBe(SetupTechnology.AGENTLESS);
      expect(setNewAgentPolicy).toHaveBeenCalledWith({
        name: 'Agentless policy for endpoint-1',
        supports_agentless: true,
        inactivity_timeout: 3600,
      });
    });
  });

  it('should update agentless policy name to match integration name if agentless is enabled', async () => {
    (useConfig as MockFn).mockReturnValue({
      agentless: {
        enabled: true,
        api: {
          url: 'https://agentless.api.url',
        },
      },
    } as any);
    (useStartServices as MockFn).mockReturnValue({
      cloud: {
        isCloudEnabled: true,
      },
    });

    const initialProps = {
      setNewAgentPolicy,
      newAgentPolicy: newAgentPolicyMock,
      setSelectedPolicyTab: setSelectedPolicyTabMock,
      packagePolicy: packagePolicyMock,
      updatePackagePolicy: updatePackagePolicyMock,
    };

    const { result, rerender } = renderHook((props = initialProps) => useSetupTechnology(props), {
      initialProps,
    });

    act(() => {
      result.current.handleSetupTechnologyChange(SetupTechnology.AGENTLESS);
    });

    expect(result.current.selectedSetupTechnology).toBe(SetupTechnology.AGENTLESS);
    expect(generateNewAgentPolicyWithDefaults).toHaveBeenCalled();
    expect(updatePackagePolicyMock).toHaveBeenCalledWith({ supports_agentless: true });
    expect(setNewAgentPolicy).toHaveBeenCalledWith({
      name: 'Agentless policy for endpoint-1',
      supports_agentless: true,
      inactivity_timeout: 3600,
    });

    rerender({
      setNewAgentPolicy,
      newAgentPolicy: newAgentPolicyMock,
      setSelectedPolicyTab: setSelectedPolicyTabMock,
      packagePolicy: {
        ...packagePolicyMock,
        name: 'endpoint-2',
      },
      updatePackagePolicy: updatePackagePolicyMock,
    });

    await waitFor(() => {
      expect(result.current.selectedSetupTechnology).toBe(SetupTechnology.AGENTLESS);
      expect(setNewAgentPolicy).toHaveBeenCalledWith({
        name: 'Agentless policy for endpoint-2',
        inactivity_timeout: 3600,
        supports_agentless: true,
      });
    });
  });

  it('should not create agentless policy isCloud is true and agentless.api.url is not defined', async () => {
    (useConfig as MockFn).mockReturnValue({} as any);
    (useStartServices as MockFn).mockReturnValue({
      cloud: {
        isCloudEnabled: true,
      },
    });

    const { result } = renderHook(() =>
      useSetupTechnology({
        setNewAgentPolicy,
        newAgentPolicy: newAgentPolicyMock,
        setSelectedPolicyTab: setSelectedPolicyTabMock,
        packagePolicy: packagePolicyMock,
        updatePackagePolicy: updatePackagePolicyMock,
      })
    );

    expect(result.current.selectedSetupTechnology).toBe(SetupTechnology.AGENT_BASED);

    act(() => {
      result.current.handleSetupTechnologyChange(SetupTechnology.AGENT_BASED);
    });

    await waitFor(() => expect(setNewAgentPolicy).toHaveBeenCalledTimes(0));
  });

  it('should update new agent policy and selected policy tab when setup technology is agent-based', async () => {
    (useConfig as MockFn).mockReturnValue({
      agentless: {
        enabled: true,
        api: {
          url: 'https://agentless.api.url',
        },
      },
    } as any);
    (useStartServices as MockFn).mockReturnValue({
      cloud: {
        isCloudEnabled: true,
      },
    });

    const { result } = renderHook(() =>
      useSetupTechnology({
        setNewAgentPolicy,
        newAgentPolicy: newAgentPolicyMock,
        setSelectedPolicyTab: setSelectedPolicyTabMock,
        packagePolicy: packagePolicyMock,
        updatePackagePolicy: updatePackagePolicyMock,
      })
    );

    expect(result.current.selectedSetupTechnology).toBe(SetupTechnology.AGENT_BASED);

    act(() => {
      result.current.handleSetupTechnologyChange(SetupTechnology.AGENTLESS);
    });

    expect(result.current.selectedSetupTechnology).toBe(SetupTechnology.AGENTLESS);
    expect(updatePackagePolicyMock).toHaveBeenCalledWith({ supports_agentless: true });

    act(() => {
      result.current.handleSetupTechnologyChange(SetupTechnology.AGENT_BASED);
    });

    expect(result.current.selectedSetupTechnology).toBe(SetupTechnology.AGENT_BASED);
    expect(updatePackagePolicyMock).toHaveBeenCalledWith({ supports_agentless: false });

    await waitFor(() => {
      expect(setNewAgentPolicy).toHaveBeenCalledWith(newAgentPolicyMock);
      expect(setSelectedPolicyTabMock).toHaveBeenCalledWith(SelectedPolicyTab.NEW);
    });
  });

  it('should not update agent policy and selected policy tab when setup technology matches the current one ', async () => {
    const { result } = renderHook(() =>
      useSetupTechnology({
        setNewAgentPolicy,
        newAgentPolicy: newAgentPolicyMock,
        setSelectedPolicyTab: setSelectedPolicyTabMock,
        packagePolicy: packagePolicyMock,
        updatePackagePolicy: updatePackagePolicyMock,
      })
    );

    await waitFor(() =>
      expect(result.current.selectedSetupTechnology).toBe(SetupTechnology.AGENT_BASED)
    );

    act(() => {
      result.current.handleSetupTechnologyChange(SetupTechnology.AGENT_BASED);
    });

    expect(result.current.selectedSetupTechnology).toBe(SetupTechnology.AGENT_BASED);

    expect(updatePackagePolicyMock).not.toHaveBeenCalled();
    expect(setNewAgentPolicy).not.toHaveBeenCalled();
    expect(setSelectedPolicyTabMock).not.toHaveBeenCalled();
  });

  it('should revert the agent policy name to the original value when switching from agentless back to agent-based', async () => {
    (useConfig as MockFn).mockReturnValue({
      agentless: {
        enabled: true,
        api: {
          url: 'https://agentless.api.url',
        },
      },
    } as any);
    (useStartServices as MockFn).mockReturnValue({
      cloud: {
        isServerlessEnabled: true,
      },
    });

    const packageInfoMock = createPackageInfoMock();

    const { result } = renderHook(() =>
      useSetupTechnology({
        setNewAgentPolicy,
        newAgentPolicy: newAgentPolicyMock,
        setSelectedPolicyTab: setSelectedPolicyTabMock,
        packagePolicy: packagePolicyMock,
        packageInfo: packageInfoMock,
        updatePackagePolicy: updatePackagePolicyMock,
      })
    );

    expect(result.current.selectedSetupTechnology).toBe(SetupTechnology.AGENT_BASED);

    act(() => {
      result.current.handleSetupTechnologyChange(SetupTechnology.AGENTLESS);
    });

    await waitFor(() =>
      expect(result.current.selectedSetupTechnology).toBe(SetupTechnology.AGENTLESS)
    );

    await waitFor(() => {
      expect(setNewAgentPolicy).toHaveBeenCalledWith({
        name: 'Agentless policy for endpoint-1',
        supports_agentless: true,
        inactivity_timeout: 3600,
      });
      expect(updatePackagePolicyMock).toHaveBeenCalledWith({ supports_agentless: true });
    });

    act(() => {
      result.current.handleSetupTechnologyChange(SetupTechnology.AGENT_BASED);
    });

    await waitFor(() => {
      expect(result.current.selectedSetupTechnology).toBe(SetupTechnology.AGENT_BASED);
      expect(setNewAgentPolicy).toHaveBeenCalledWith(newAgentPolicyMock);
      expect(updatePackagePolicyMock).toHaveBeenCalledWith({ supports_agentless: false });
    });
  });

  it('should not have agentless section on the request when creating agentless policy without resources', async () => {
    (useConfig as MockFn).mockReturnValue({
      agentless: {
        enabled: true,
        api: {
          url: 'https://agentless.api.url',
        },
      },
    } as any);
    (useStartServices as MockFn).mockReturnValue({
      cloud: {
        isCloudEnabled: true,
      },
    });

    const { result } = renderHook(() =>
      useSetupTechnology({
        setNewAgentPolicy,
        newAgentPolicy: newAgentPolicyMock,
        setSelectedPolicyTab: setSelectedPolicyTabMock,
        packagePolicy: packagePolicyMock,
        packageInfo: createPackageInfoMock({ agentless: { withResources: false } }),
        updatePackagePolicy: updatePackagePolicyMock,
      })
    );

    act(() => {
      result.current.handleSetupTechnologyChange(SetupTechnology.AGENTLESS);
    });

    await waitFor(() => {
      expect(setNewAgentPolicy).toHaveBeenCalledWith(
        expect.not.objectContaining({
          agentless: {},
        })
      );
    });
  });

  it('should not have agentless section on the request when creating policy with agentless disabled', async () => {
    (useConfig as MockFn).mockReturnValue({
      agentless: {
        enabled: true,
        api: {
          url: 'https://agentless.api.url',
        },
      },
    } as any);
    (useStartServices as MockFn).mockReturnValue({
      cloud: {
        isCloudEnabled: true,
      },
    });

    const { result } = renderHook(() =>
      useSetupTechnology({
        setNewAgentPolicy,
        newAgentPolicy: newAgentPolicyMock,
        setSelectedPolicyTab: setSelectedPolicyTabMock,
        packagePolicy: packagePolicyMock,
        packageInfo: createPackageInfoMock({ agentless: { enabled: false } }),
        updatePackagePolicy: updatePackagePolicyMock,
      })
    );

    act(() => {
      result.current.handleSetupTechnologyChange(SetupTechnology.AGENTLESS);
    });

    await waitFor(() => {
      expect(setNewAgentPolicy).toHaveBeenCalledWith(
        expect.not.objectContaining({
          agentless: {},
        })
      );
    });
  });

  it('should not have global_data_tags with the integration team when creating agentless policy with global_data_tags', async () => {
    (useConfig as MockFn).mockReturnValue({
      agentless: {
        enabled: true,
        api: {
          url: 'https://agentless.api.url',
        },
      },
    } as any);
    (useStartServices as MockFn).mockReturnValue({
      cloud: {
        isCloudEnabled: true,
      },
    });

    const { result } = renderHook(() =>
      useSetupTechnology({
        setNewAgentPolicy,
        newAgentPolicy: newAgentPolicyMock,
        setSelectedPolicyTab: setSelectedPolicyTabMock,
        packagePolicy: packagePolicyMock,
        packageInfo: createPackageInfoMock(),
        updatePackagePolicy: updatePackagePolicyMock,
      })
    );

    act(() => {
      result.current.handleSetupTechnologyChange(SetupTechnology.AGENTLESS);
    });

    await waitFor(() => {
      expect(setNewAgentPolicy).toHaveBeenCalledWith(
        expect.objectContaining({
          supports_agentless: true,
        })
      );
    });
  });

  it('should not fail and not have global_data_tags when creating the agentless policy when it cannot find the policy template', async () => {
    (useConfig as MockFn).mockReturnValue({
      agentless: {
        enabled: true,
        api: {
          url: 'https://agentless.api.url',
        },
      },
    } as any);
    (useStartServices as MockFn).mockReturnValue({
      cloud: {
        isCloudEnabled: true,
      },
    });

    // const packageInfoWithoutGlobalDataTags = {
    //   policy_templates: [
    //     {
    //       name: 'cspm',
    //       title: 'Template 1',
    //       description: '',
    //       deployment_modes: {
    //         default: {
    //           enabled: true,
    //         },
    //         agentless: {
    //           enabled: true,
    //         },
    //       },
    //     },
    //     {
    //       name: 'not-cspm',
    //       title: 'Template 2',
    //       description: '',
    //       deployment_modes: {
    //         default: {
    //           enabled: true,
    //         },
    //       },
    //     },
    //   ] as RegistryPolicyTemplate[],
    // } as PackageInfo;

    const { result } = renderHook(() =>
      useSetupTechnology({
        setNewAgentPolicy,
        newAgentPolicy: newAgentPolicyMock,
        setSelectedPolicyTab: setSelectedPolicyTabMock,
        packagePolicy: packagePolicyMock,
        packageInfo: createPackageInfoMock({
          agentless: { withGlobalDataTags: false, withResources: false },
        }),
        updatePackagePolicy: updatePackagePolicyMock,
      })
    );

    act(() => {
      result.current.handleSetupTechnologyChange(SetupTechnology.AGENTLESS);
    });

    await waitFor(() => {
      expect(setNewAgentPolicy).toHaveBeenCalledWith({
        name: 'Agentless policy for endpoint-1',
        supports_agentless: true,
        inactivity_timeout: 3600,
      });
      expect(setNewAgentPolicy).not.toHaveBeenCalledWith({
        global_data_tags: [
          { name: 'organization', value: 'org' },
          { name: 'division', value: 'div' },
          { name: 'team', value: 'team' },
        ],
      });
    });
  });

  it('should not fail and not have global_data_tags when creating the agentless policy without the policy template name', async () => {
    (useConfig as MockFn).mockReturnValue({
      agentless: {
        enabled: true,
        api: {
          url: 'https://agentless.api.url',
        },
      },
    } as any);
    (useStartServices as MockFn).mockReturnValue({
      cloud: {
        isCloudEnabled: true,
      },
    });

    // const packageInfoWithoutGlobalDataTags = {
    //   policy_templates: [
    //     {
    //       name: 'cspm',
    //       title: 'Template 1',
    //       description: '',
    //       deployment_modes: {
    //         default: {
    //           enabled: true,
    //         },
    //         agentless: {
    //           enabled: true,
    //         },
    //       },
    //     },
    //     {
    //       name: 'not-cspm',
    //       title: 'Template 2',
    //       description: '',
    //       deployment_modes: {
    //         default: {
    //           enabled: true,
    //         },
    //       },
    //     },
    //   ] as RegistryPolicyTemplate[],
    // } as PackageInfo;

    const { result } = renderHook(() =>
      useSetupTechnology({
        setNewAgentPolicy,
        newAgentPolicy: newAgentPolicyMock,
        setSelectedPolicyTab: setSelectedPolicyTabMock,
        packagePolicy: packagePolicyMock,
        packageInfo: createPackageInfoMock({
          agentless: { withGlobalDataTags: false, withResources: false },
        }),
        updatePackagePolicy: updatePackagePolicyMock,
      })
    );

    act(() => {
      result.current.handleSetupTechnologyChange(SetupTechnology.AGENTLESS);
    });

    await waitFor(() => {
      expect(setNewAgentPolicy).toHaveBeenCalledWith({
        name: 'Agentless policy for endpoint-1',
        supports_agentless: true,
        inactivity_timeout: 3600,
      });
      expect(setNewAgentPolicy).not.toHaveBeenCalledWith({
        global_data_tags: [
          { name: 'organization', value: 'org' },
          { name: 'division', value: 'div' },
          { name: 'team', value: 'team' },
        ],
      });
    });
  });

  it('should not fail and not have global_data_tags when creating the agentless policy without the packageInfo', async () => {
    (useConfig as MockFn).mockReturnValue({
      agentless: {
        enabled: true,
        api: {
          url: 'https://agentless.api.url',
        },
      },
    } as any);
    (useStartServices as MockFn).mockReturnValue({
      cloud: {
        isCloudEnabled: true,
      },
    });

    const { result } = renderHook(() =>
      useSetupTechnology({
        setNewAgentPolicy,
        newAgentPolicy: newAgentPolicyMock,
        setSelectedPolicyTab: setSelectedPolicyTabMock,
        packagePolicy: packagePolicyMock,
        updatePackagePolicy: updatePackagePolicyMock,
      })
    );

    act(() => {
      result.current.handleSetupTechnologyChange(SetupTechnology.AGENTLESS);
    });

    await waitFor(() => {
      expect(setNewAgentPolicy).toHaveBeenCalledWith({
        name: 'Agentless policy for endpoint-1',
        supports_agentless: true,
        inactivity_timeout: 3600,
      });
      expect(setNewAgentPolicy).not.toHaveBeenCalledWith({
        global_data_tags: [
          { name: 'organization', value: 'org' },
          { name: 'division', value: 'div' },
          { name: 'team', value: 'team' },
        ],
      });
    });
  });

  it('should not have global_data_tags when switching from agentless to agent-based policy', async () => {
    (useConfig as MockFn).mockReturnValue({
      agentless: {
        enabled: true,
        api: {
          url: 'https://agentless.api.url',
        },
      },
    } as any);
    (useStartServices as MockFn).mockReturnValue({
      cloud: {
        isCloudEnabled: true,
      },
    });

    const packageInfoMock = createPackageInfoMock();

    const { result } = renderHook(() =>
      useSetupTechnology({
        setNewAgentPolicy,
        newAgentPolicy: newAgentPolicyMock,
        setSelectedPolicyTab: setSelectedPolicyTabMock,
        packagePolicy: packagePolicyMock,
        packageInfo: packageInfoMock,
        updatePackagePolicy: updatePackagePolicyMock,
      })
    );

    act(() => {
      result.current.handleSetupTechnologyChange(SetupTechnology.AGENTLESS);
    });

    await waitFor(() => {
      expect(result.current.selectedSetupTechnology).toBe(SetupTechnology.AGENTLESS);
      expect(setNewAgentPolicy).toHaveBeenCalledWith(
        expect.objectContaining({
          supports_agentless: true,
        })
      );
    });

    act(() => {
      result.current.handleSetupTechnologyChange(SetupTechnology.AGENT_BASED);
    });

    await waitFor(() => {
      expect(result.current.selectedSetupTechnology).toBe(SetupTechnology.AGENT_BASED);
      expect(setNewAgentPolicy).toHaveBeenCalledWith(newAgentPolicyMock);
      expect(setNewAgentPolicy).not.toHaveBeenCalledWith({
        global_data_tags: [
          { name: 'organization', value: 'org' },
          { name: 'division', value: 'div' },
          { name: 'team', value: 'team' },
        ],
      });
    });
  });
});

describe('isAgentlessSetupDefault', () => {
  it('should return true if there is only agentless default deployment', () => {
    const isAgentlessDefault = false;
    const packageInfo = {
      policy_templates: [
        {
          name: 'template1',
          deployment_modes: {
            agentless: {
              is_default: true,
            },
          },
        },
      ] as RegistryPolicyTemplate[],
    } as PackageInfo;

    const result = isAgentlessSetupDefault(isAgentlessDefault, packageInfo);

    expect(result).toBe(true);
  });

  it('should return true if the integration to enable matches an agentless default deployment', () => {
    const isAgentlessDefault = false;
    const packageInfo = {
      policy_templates: [
        {
          name: 'template1',
          deployment_modes: {
            agentless: {
              is_default: true,
            },
          },
        },
      ] as RegistryPolicyTemplate[],
    } as PackageInfo;

    const result = isAgentlessSetupDefault(isAgentlessDefault, packageInfo, 'template1');

    expect(result).toBe(true);
  });

  it('should return true if isAgentlessDefault is true and there is an agentless deployment', () => {
    const isAgentlessDefault = true;
    const packageInfo = {
      policy_templates: [
        {
          name: 'template1',
          title: 'Template 1',
          description: '',
          deployment_modes: {
            agentless: {},
          },
        },
      ] as RegistryPolicyTemplate[],
    } as PackageInfo;

    const result = isAgentlessSetupDefault(isAgentlessDefault, packageInfo);

    expect(result).toBe(true);
  });

  it('should return false if isAgentlessDefault is true and there is no agentless deployment', () => {
    const isAgentlessDefault = true;
    const packageInfo = {
      policy_templates: [
        {
          name: 'template1',
          title: 'Template 1',
          description: '',
          deployment_modes: {},
        },
      ] as RegistryPolicyTemplate[],
    } as PackageInfo;

    const result = isAgentlessSetupDefault(isAgentlessDefault, packageInfo);

    expect(result).toBe(false);
  });

  it('should return false if there is no agentless default deployment and isAgentlessDefault is false', () => {
    const isAgentlessDefault = false;
    const packageInfo = {
      policy_templates: [
        {
          name: 'template1',
          deployment_modes: {
            agentless: {},
          },
        },
      ] as RegistryPolicyTemplate[],
    } as PackageInfo;

    const result = isAgentlessSetupDefault(isAgentlessDefault, packageInfo);

    expect(result).toBe(false);
  });

  it('should return false if the integration to enable does not match any agentless default deployment', () => {
    const isAgentlessDefault = false;
    const packageInfo = {
      policy_templates: [
        {
          name: 'template1',
          deployment_modes: {
            agentless: {
              is_default: true,
            },
          },
        },
        {
          name: 'template2',
          deployment_modes: {},
        },
      ] as RegistryPolicyTemplate[],
    } as PackageInfo;

    const result = isAgentlessSetupDefault(isAgentlessDefault, packageInfo, 'template2');

    expect(result).toBe(false);
  });

  it('should return false if packageInfo is undefined', () => {
    const isAgentlessDefault = true;

    const result = isAgentlessSetupDefault(isAgentlessDefault);

    expect(result).toBe(false);
  });

  it('should return false if deployment_modes is undefined in all policy templates', () => {
    const isAgentlessDefault = true;
    const packageInfo = {
      policy_templates: [
        {
          name: 'template1',
        },
        {
          name: 'template2',
        },
      ] as RegistryPolicyTemplate[],
    } as PackageInfo;

    const result = isAgentlessSetupDefault(isAgentlessDefault, packageInfo);

    expect(result).toBe(false);
  });

  it('should return false if no policy templates', () => {
    const isAgentlessDefault = true;
    const packageInfo = {
      policy_templates: [] as RegistryPolicyTemplate[],
    } as PackageInfo;

    const result = isAgentlessSetupDefault(isAgentlessDefault, packageInfo);

    expect(result).toBe(false);
  });
});
