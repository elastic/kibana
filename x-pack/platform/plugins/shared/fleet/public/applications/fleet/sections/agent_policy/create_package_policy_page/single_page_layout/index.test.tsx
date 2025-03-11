/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Route } from '@kbn/shared-ux-router';
import React from 'react';
import { fireEvent, act, waitFor } from '@testing-library/react';

import type { MockedFleetStartServices, TestRenderer } from '../../../../../../mock';
import { createFleetTestRendererMock } from '../../../../../../mock';
import { FLEET_ROUTING_PATHS, pagePathGetters, PLUGIN_ID } from '../../../../constants';
import type { CreatePackagePolicyRouteState } from '../../../../types';
import {
  sendCreatePackagePolicy,
  sendCreateAgentPolicy,
  sendGetAgentStatus,
  useIntraAppState,
  useStartServices,
  useGetPackageInfoByKeyQuery,
  useConfig,
} from '../../../../hooks';

jest.mock('../components/steps/components/use_policies', () => {
  return {
    ...jest.requireActual('../components/steps/components/use_policies'),
    useAllNonManagedAgentPolicies: jest.fn().mockReturnValue([
      {
        id: 'agent-policy-1',
        name: 'Agent policy 1',
        namespace: 'default',
        unprivileged_agents: 1,
      },
    ]),
  };
});

jest.mock('../../../../hooks', () => {
  return {
    ...jest.requireActual('../../../../hooks'),
    useConfig: jest.fn().mockReturnValue({
      agents: { enabled: true },
    }),
    useFleetStatus: jest.fn().mockReturnValue({ isReady: true } as any),
    sendGetStatus: jest
      .fn()
      .mockResolvedValue({ data: { isReady: true, missing_requirements: [] } }),
    sendGetAgentStatus: jest.fn().mockResolvedValue({ data: { results: { active: 0 } } }),
    useGetAgentPolicies: jest.fn().mockReturnValue({
      data: {
        items: [
          {
            id: 'agent-policy-1',
            name: 'Agent policy 1',
            namespace: 'default',
            unprivileged_agents: 1,
          },
        ],
      },
      error: undefined,
      isLoading: false,
      resendRequest: jest.fn(),
    } as any),
    sendGetOneAgentPolicy: jest.fn().mockResolvedValue({
      data: {
        item: {
          id: 'agent-policy-1',
          name: 'Agent policy 1',
          namespace: 'default',
          unprivileged_agents: 1,
        },
      },
    }),
    sendBulkGetAgentPolicies: jest.fn().mockImplementation((ids) =>
      Promise.resolve({
        data: { items: ids.map((id: string) => ({ id, package_policies: [] })) },
      })
    ),
    useGetPackageInfoByKeyQuery: jest.fn(),
    sendGetSettings: jest.fn().mockResolvedValue({
      data: { item: {} },
    }),
    sendCreatePackagePolicy: jest.fn().mockResolvedValue({
      data: {
        item: {
          id: 'policy-1',
          inputs: [],
          policy_ids: ['agent-policy-1'],
        },
      },
    }),
    sendCreateAgentPolicy: jest.fn().mockResolvedValue({
      data: { item: { id: 'agent-policy-2', name: 'Agent policy 2', namespace: 'default' } },
    }),
    useIntraAppState: jest.fn().mockReturnValue({}),
    useStartServices: jest.fn().mockReturnValue({
      application: { navigateToApp: jest.fn() },
      notifications: {
        toasts: {
          addError: jest.fn(),
          addSuccess: jest.fn(),
        },
      },
      docLinks: {
        links: {
          fleet: {},
        },
      },
      http: {
        basePath: {
          get: () => 'http://localhost:5620',
          prepend: (url: string) => 'http://localhost:5620' + url,
        },
      },
      chrome: {
        docTitle: {
          change: jest.fn(),
        },
        setBreadcrumbs: jest.fn(),
      },
      cloud: {
        isServerlessEnabled: false,
      },
    }),
  };
});

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useLocation: jest.fn().mockReturnValue({ search: '' }),
  useHistory: jest.fn().mockReturnValue({
    push: jest.fn(),
    listen: jest.fn(),
    location: {
      search: '',
    },
  }),
}));

import { CreatePackagePolicySinglePage } from '.';
import { SETUP_TECHNOLOGY_SELECTOR_TEST_SUBJ } from './components/setup_technology_selector';

// mock console.debug to prevent noisy logs from console.debugs in ./index.tsx
let consoleDebugMock: any;
beforeAll(() => {
  consoleDebugMock = jest.spyOn(console, 'debug').mockImplementation(() => {});
});
afterAll(() => {
  consoleDebugMock.mockRestore();
});

describe('When on the package policy create page', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  const createPageUrlPath = pagePathGetters.add_integration_to_policy({ pkgkey: 'nginx-1.3.0' })[1];

  let testRenderer: TestRenderer;
  let renderResult: ReturnType<typeof testRenderer.render>;
  const render = (queryParamsPolicyId?: string) =>
    (renderResult = testRenderer.render(
      <Route path={FLEET_ROUTING_PATHS.add_integration_to_policy}>
        <CreatePackagePolicySinglePage
          from="package"
          queryParamsPolicyId={queryParamsPolicyId}
          prerelease={false}
        />
      </Route>
    ));

  function getMockPackageInfo(options?: {
    requiresRoot?: boolean;
    dataStreamRequiresRoot?: boolean;
    agentlessEnabled?: boolean;
  }) {
    return {
      data: {
        item: {
          name: 'nginx',
          title: 'Nginx',
          version: '1.3.0',
          description: 'Collect logs and metrics from Nginx HTTP servers with Elastic Agent.',
          policy_templates: [
            {
              name: 'nginx',
              title: 'Nginx logs and metrics',
              description: 'Collect logs and metrics from Nginx instances',
              inputs: [
                {
                  type: 'logfile',
                  title: 'Collect logs from Nginx instances',
                  description: 'Collecting Nginx access and error logs',
                },
              ],
              multiple: true,
              deployment_modes: options?.agentlessEnabled
                ? {
                    agentless: {
                      enabled: true,
                      organization: 'org',
                      division: 'division',
                      team: 'team',
                    },
                  }
                : { agentless: { enabled: false } },
            },
          ],
          data_streams: [
            {
              type: 'logs',
              name: 'access logs',
              dataset: 'nginx.access',
              title: 'Nginx access logs',
              ingest_pipeline: 'default',
              agent: {
                privileges: {
                  root: options?.dataStreamRequiresRoot,
                },
              },
              streams: [
                {
                  input: 'logfile',
                  vars: [
                    {
                      name: 'paths',
                      type: 'text',
                      title: 'Paths',
                      multi: true,
                      required: true,
                      show_user: true,
                      default: ['/var/log/nginx/access.log*'],
                    },
                  ],
                  template_path: 'stream.yml.hbs',
                  title: 'Nginx access logs',
                  description: 'Collect Nginx access logs',
                  enabled: true,
                },
              ],
              package: 'nginx',
              path: 'access',
            },
          ],
          latestVersion: '1.3.0',
          keepPoliciesUpToDate: false,
          status: 'not_installed',
          agent: {
            privileges: {
              root: options?.requiresRoot,
            },
          },
        },
      },
      isLoading: false,
    };
  }

  beforeEach(() => {
    testRenderer = createFleetTestRendererMock();
    mockApiCalls(testRenderer.startServices.http);
    testRenderer.mountHistory.push(createPageUrlPath);

    jest.mocked(useStartServices().application.navigateToApp).mockReset();

    (useGetPackageInfoByKeyQuery as jest.Mock).mockReturnValue(getMockPackageInfo());
  });

  describe('And Route state is provided via Fleet HashRouter', () => {
    let expectedRouteState: CreatePackagePolicyRouteState;

    beforeEach(() => {
      expectedRouteState = {
        onCancelUrl: 'http://cancel/url/here',
        onCancelNavigateTo: [PLUGIN_ID, { path: '/cancel/url/here' }],
      };

      testRenderer.mountHistory.replace({
        pathname: createPageUrlPath,
        state: expectedRouteState,
      });

      (useIntraAppState as jest.MockedFunction<any>).mockReturnValue(expectedRouteState);
    });

    describe('and the cancel Link or Button is clicked', () => {
      let cancelLink: HTMLAnchorElement;
      let cancelButton: HTMLAnchorElement;

      beforeEach(async () => {
        render();

        cancelLink = renderResult.getByTestId(
          'createPackagePolicy_cancelBackLink'
        ) as HTMLAnchorElement;

        cancelButton = (await renderResult.findByTestId(
          'createPackagePolicyCancelButton'
        )) as HTMLAnchorElement;
      });

      test('should use custom "cancel" URL', () => {
        expect(cancelLink.href).toBe(expectedRouteState.onCancelUrl);
        expect(cancelButton.href).toBe(expectedRouteState.onCancelUrl);
      }, 10000);
    });
  });

  describe('Submit page', () => {
    const newPackagePolicy = {
      description: '',
      enabled: true,
      inputs: [
        {
          enabled: true,
          policy_template: 'nginx',
          streams: [
            {
              data_stream: {
                dataset: 'nginx.access',
                type: 'logs',
              },
              enabled: true,
              vars: {
                paths: {
                  type: 'text',
                  value: ['/var/log/nginx/access.log*'],
                },
              },
            },
          ],
          type: 'logfile',
        },
      ],
      name: 'nginx-1',
      namespace: '',
      package: {
        name: 'nginx',
        title: 'Nginx',
        version: '1.3.0',
      },
      policy_ids: ['agent-policy-1'],
      vars: undefined,
    };

    beforeEach(() => {
      (sendCreatePackagePolicy as jest.MockedFunction<any>).mockClear();
    });

    test('should show root privileges callout on create page', async () => {
      (useGetPackageInfoByKeyQuery as jest.Mock).mockReturnValue(
        getMockPackageInfo({ requiresRoot: true })
      );
      await act(async () => {
        render('agent-policy-1');
      });

      await waitFor(() => {
        expect(renderResult.getByText('Requires root privileges')).toBeInTheDocument();
        expect(renderResult.getByTestId('rootPrivilegesCallout').textContent).toContain(
          'Elastic Agent needs to be run with root/administrator privileges for this integration.'
        );
      });
    });

    test('should show root privileges callout with data streams on create page', async () => {
      (useGetPackageInfoByKeyQuery as jest.Mock).mockReturnValue(
        getMockPackageInfo({ dataStreamRequiresRoot: true })
      );
      await act(async () => {
        render('agent-policy-1');
      });

      await waitFor(() => {
        expect(renderResult.getByText('Requires root privileges')).toBeInTheDocument();
        expect(renderResult.getByTestId('rootPrivilegesCallout').textContent).toContain(
          'This integration has the following data streams that require Elastic Agents to have root privileges. To ensure that all data required by the integration can be collected, enroll agents using an account with root privileges.'
        );
        expect(renderResult.getByTestId('rootPrivilegesCallout').textContent).toContain(
          'Nginx access logs'
        );
      });
    });

    test('should create package policy on submit when query param agent policy id is set', async () => {
      await act(async () => {
        render('agent-policy-1');
      });

      let saveBtn: HTMLElement;

      await waitFor(() => {
        saveBtn = renderResult.getByText(/Save and continue/).closest('button')!;
        expect(saveBtn).not.toBeDisabled();
      });

      await act(async () => {
        fireEvent.click(saveBtn);
      });

      expect(sendCreatePackagePolicy as jest.MockedFunction<any>).toHaveBeenCalledWith({
        ...newPackagePolicy,
        policy_ids: ['agent-policy-1'],
        force: false,
      });
      expect(sendCreateAgentPolicy as jest.MockedFunction<any>).not.toHaveBeenCalled();

      await waitFor(() => {
        expect(renderResult.getByText('Nginx integration added')).toBeInTheDocument();
      });
    });

    describe('On save navigate', () => {
      async function setupSaveNavigate(routeState: any, queryParamsPolicyId?: string) {
        (useIntraAppState as jest.MockedFunction<any>).mockReturnValue(routeState);
        render(queryParamsPolicyId);

        await act(async () => {
          fireEvent.click(renderResult.getByText('Existing hosts')!);
        });

        await act(async () => {
          fireEvent.click(renderResult.getByText(/Save and continue/).closest('button')!);
        });

        await waitFor(
          async () => {
            expect(
              await renderResult.findByText(/Add Elastic Agent to your hosts/)
            ).toBeInTheDocument();
          },
          { timeout: 10000 }
        );

        await act(async () => {
          fireEvent.click(
            renderResult.getByText(/Add Elastic Agent to your hosts/).closest('button')!
          );
        });
      }

      test('should navigate to save navigate path if set', async () => {
        const routeState = {
          onSaveNavigateTo: [PLUGIN_ID, { path: '/save/url/here' }],
        };

        await setupSaveNavigate(routeState);

        expect(useStartServices().application.navigateToApp).toHaveBeenCalledWith(PLUGIN_ID, {
          path: '/save/url/here',
        });
      });

      test('should navigate to save navigate path with query param if set', async () => {
        const routeState = {
          onSaveNavigateTo: [PLUGIN_ID, { path: '/save/url/here' }],
          onSaveQueryParams: {
            openEnrollmentFlyout: true,
          },
        };
        const queryParamsPolicyId = 'agent-policy-1';
        await setupSaveNavigate(routeState, queryParamsPolicyId);

        expect(useStartServices().application.navigateToApp).toHaveBeenCalledWith(PLUGIN_ID, {
          path: '/policies/agent-policy-1?openEnrollmentFlyout=true',
        });
      });

      test('should navigate to save navigate app if set', async () => {
        const routeState = {
          onSaveNavigateTo: [PLUGIN_ID],
        };
        await setupSaveNavigate(routeState);

        expect(useStartServices().application.navigateToApp).toHaveBeenCalledWith(PLUGIN_ID);
      });

      test('should navigate to agent policy if no route state is set', async () => {
        await setupSaveNavigate({});

        expect(useStartServices().application.navigateToApp).toHaveBeenCalledWith(PLUGIN_ID, {
          path: '/policies/agent-policy-1?openEnrollmentFlyout=true',
        });
      });
    });

    test('should create agent policy without sys monitoring when new hosts is selected for system integration', async () => {
      (useGetPackageInfoByKeyQuery as jest.Mock).mockReturnValue({
        ...getMockPackageInfo(),
        data: {
          item: {
            ...getMockPackageInfo().data!.item,
            name: 'system',
          },
        },
      });

      await act(async () => {
        render();
      });

      await waitFor(() => {
        renderResult.getByDisplayValue('Agent policy 2');
      });

      await act(async () => {
        fireEvent.click(renderResult.getByText(/Save and continue/).closest('button')!);
      });

      expect(sendCreateAgentPolicy as jest.MockedFunction<any>).toHaveBeenCalledWith(
        {
          description: '',
          monitoring_enabled: ['logs', 'metrics', 'traces'],
          name: 'Agent policy 2',
          namespace: 'default',
          inactivity_timeout: 1209600,
          is_protected: false,
        },
        { withSysMonitoring: false }
      );
    });

    describe('Without query param', () => {
      beforeEach(async () => {
        await act(async () => {
          render();
        });

        (sendCreateAgentPolicy as jest.MockedFunction<any>).mockClear();
        (sendCreatePackagePolicy as jest.MockedFunction<any>).mockClear();
        (sendGetAgentStatus as jest.MockedFunction<any>).mockResolvedValue({
          data: { results: { active: 0 } },
        });
      });

      test('should create agent policy before creating package policy on submit when new hosts is selected', async () => {
        await waitFor(() => {
          renderResult.getByDisplayValue('Agent policy 2');
        });

        await act(async () => {
          fireEvent.click(renderResult.getByText(/Save and continue/).closest('button')!);
        });

        expect(sendCreateAgentPolicy as jest.MockedFunction<any>).toHaveBeenCalledWith(
          {
            description: '',
            monitoring_enabled: ['logs', 'metrics', 'traces'],
            name: 'Agent policy 2',
            namespace: 'default',
            inactivity_timeout: 1209600,
            is_protected: false,
          },
          { withSysMonitoring: true }
        );
        expect(sendCreatePackagePolicy as jest.MockedFunction<any>).toHaveBeenCalledWith({
          ...newPackagePolicy,
          policy_ids: ['agent-policy-2'],
          force: false,
        });

        await waitFor(() => {
          expect(renderResult.getByText('Nginx integration added')).toBeInTheDocument();
        });
      });

      test('should disable submit button on invalid form with empty agent policy name', async () => {
        await act(async () => {
          fireEvent.change(renderResult.getByLabelText('New agent policy name'), {
            target: { value: '' },
          });
        });

        renderResult.getByText(
          'Your integration policy has errors. Please fix them before saving.'
        );
        expect(renderResult.getByText(/Save and continue/).closest('button')!).toBeDisabled();
      });

      test('should show modal if agent policy has agents', async () => {
        (sendGetAgentStatus as jest.MockedFunction<any>).mockResolvedValue({
          data: { results: { active: 1 } },
        });

        await act(async () => {
          fireEvent.click(renderResult.getByText('Existing hosts')!);
        });

        await act(async () => {
          fireEvent.click(renderResult.getByText(/Save and continue/).closest('button')!);
        });

        await waitFor(() => {
          expect(renderResult.getByText('This action will update 1 agent')).toBeInTheDocument();
        });

        await act(async () => {
          fireEvent.click(
            renderResult.getAllByText(/Save and deploy changes/)[1].closest('button')!
          );
        });

        expect(sendCreatePackagePolicy as jest.MockedFunction<any>).toHaveBeenCalled();
      });

      describe('create package policy with existing agent policy', () => {
        beforeEach(async () => {
          await act(async () => {
            fireEvent.click(renderResult.getByText('Existing hosts')!);
          });
        });

        test('should creating package policy with existing host', async () => {
          await act(async () => {
            fireEvent.click(renderResult.getByText(/Save and continue/).closest('button')!);
          });

          expect(sendCreateAgentPolicy as jest.MockedFunction<any>).not.toHaveBeenCalled();
          expect(sendCreatePackagePolicy as jest.MockedFunction<any>).toHaveBeenCalledWith({
            ...newPackagePolicy,
            policy_ids: ['agent-policy-1'],
            force: false,
          });

          await waitFor(() => {
            expect(renderResult.getByText('Nginx integration added')).toBeInTheDocument();
          });
        });

        test('should disable submit button on invalid form with empty name', async () => {
          await act(async () => {
            fireEvent.change(renderResult.getByTestId('packagePolicyNameInput'), {
              target: { value: '' },
            });
          });

          renderResult.getByText(
            'Your integration policy has errors. Please fix them before saving.'
          );
          expect(renderResult.getByText(/Save and continue/).closest('button')!).toBeDisabled();
        });

        test('should disable submit button on invalid form with empty package var', async () => {
          await act(async () => {
            fireEvent.click(renderResult.getByText('Change defaults'));
          });

          await act(async () => {
            fireEvent.change(renderResult.getByDisplayValue('/var/log/nginx/access.log*'), {
              target: { value: '' },
            });
          });

          renderResult.getByText(
            'Your integration policy has errors. Please fix them before saving.'
          );
          expect(renderResult.getByText(/Save and continue/).closest('button')!).toBeDisabled();
        });

        test('should submit form with changed package var', async () => {
          await act(async () => {
            fireEvent.click(renderResult.getByText('Change defaults'));
          });

          await act(async () => {
            fireEvent.change(renderResult.getByDisplayValue('/var/log/nginx/access.log*'), {
              target: { value: '/path/to/log' },
            });
          });

          await act(async () => {
            fireEvent.click(renderResult.getByText(/Save and continue/).closest('button')!);
          });

          expect(sendCreatePackagePolicy as jest.MockedFunction<any>).toHaveBeenCalledWith({
            ...newPackagePolicy,
            inputs: [
              {
                ...newPackagePolicy.inputs[0],
                streams: [
                  {
                    ...newPackagePolicy.inputs[0].streams[0],
                    vars: {
                      paths: {
                        type: 'text',
                        value: ['/path/to/log'],
                      },
                    },
                  },
                ],
              },
            ],
            force: false,
          });
        });
      });
    });

    describe('With agentless Cloud available', () => {
      beforeEach(async () => {
        (useConfig as jest.MockedFunction<any>).mockReturnValue({
          agentless: {
            enabled: true,
            api: {
              url: 'http://agentless-api-url',
            },
          },
          agents: { enabled: true },
        });
        (useStartServices as jest.MockedFunction<any>).mockReturnValue({
          ...useStartServices(),
          cloud: {
            ...useStartServices().cloud,
            isServerlessEnabled: false,
            isCloudEnabled: true,
          },
        });
        (sendCreateAgentPolicy as jest.MockedFunction<any>).mockResolvedValue({
          data: {
            item: { id: 'agentless-policy-1', name: 'Agentless policy 1', namespace: 'default' },
          },
        });

        (useGetPackageInfoByKeyQuery as jest.Mock).mockReturnValue(
          getMockPackageInfo({
            requiresRoot: false,
            dataStreamRequiresRoot: false,
            agentlessEnabled: true,
          })
        );
        await act(async () => {
          render();
        });
      });

      test('should create agent policy and package policy when in cloud and agentless API url is set', async () => {
        await act(async () => {
          fireEvent.click(renderResult.getByText(/Save and continue/).closest('button')!);
        });

        expect(sendCreateAgentPolicy).toHaveBeenCalledWith(
          expect.objectContaining({
            monitoring_enabled: ['logs', 'metrics'],
            name: 'Agentless policy for nginx-1',
          }),
          { withSysMonitoring: true }
        );
        expect(sendCreatePackagePolicy).toHaveBeenCalled();

        await waitFor(() => {
          expect(renderResult.getByText('Nginx integration added')).toBeInTheDocument();
        });
      });

      test('should create agentless agent policy and package policy when in cloud and agentless API url is set', async () => {
        await waitFor(() => {
          expect(renderResult.getByTestId(SETUP_TECHNOLOGY_SELECTOR_TEST_SUBJ)).toBeInTheDocument();
        });

        fireEvent.click(renderResult.getAllByText('Agentless')[0]);

        await act(async () => {
          fireEvent.click(renderResult.getByText(/Save and continue/).closest('button')!);
        });

        expect(sendCreateAgentPolicy).toHaveBeenCalledWith(
          expect.objectContaining({
            monitoring_enabled: ['logs', 'metrics'],
            name: 'Agentless policy for nginx-1',
            supports_agentless: true,
          }),
          { withSysMonitoring: true }
        );
        expect(sendCreatePackagePolicy).toHaveBeenCalled();

        await waitFor(() => {
          expect(renderResult.getByText('Nginx integration added')).toBeInTheDocument();
        });
      });
    });
  });
});

const mockApiCalls = (http: MockedFleetStartServices['http']) => {
  http.get.mockImplementation(async (path: any) => {
    if (path === '/api/fleet/agents/setup') {
      return Promise.resolve({ data: { results: { active: 0 } } });
    }
    if (path === '/api/fleet/package_policies') {
      return Promise.resolve({ data: { items: [] } });
    }
    if (path === '/api/fleet/outputs') {
      return Promise.resolve({ data: { items: [] } });
    }
    if (path === '/api/fleet/fleet_server_hosts') {
      return Promise.resolve({ data: { items: [] } });
    }
    if (path === '/api/fleet/agent_download_sources') {
      return Promise.resolve({ data: { items: [] } });
    }
    const err = new Error(`API [GET ${path}] is not MOCKED!`);
    // eslint-disable-next-line no-console
    console.log(err);
    throw err;
  });
};
