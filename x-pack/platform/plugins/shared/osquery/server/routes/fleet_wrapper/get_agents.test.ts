/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, httpServiceMock } from '@kbn/core/server/mocks';
import type { RequestHandler } from '@kbn/core/server';
import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';
import { validateAgentKueryFields } from '@kbn/fleet-plugin/server/routes/utils/filter_utils';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { getAgentsRoute } from './get_agents';

jest.mock('../utils', () => ({
  getInternalSavedObjectsClient: jest.fn().mockResolvedValue({}),
}));

const POLICY_SCOPE = '(policy_id:policy-1 or policy_id:policy-2)';

/** The kuery the agent picker (`public/agents/use_all_agents.ts`) sends for a search. */
const buildPickerSearchKuery = (searchValue: string) =>
  `${POLICY_SCOPE} and (local_metadata.host.hostname.keyword:*${searchValue}* or local_metadata.elastic.agent.id:*${searchValue}* or policy_id: *${searchValue}* or local_metadata.os.platform: *${searchValue}* or policy_name:${searchValue} )`;

describe('getAgentsRoute', () => {
  let routeHandler: RequestHandler<unknown, Record<string, unknown>, unknown>;

  const mockListAgents = jest.fn();
  const mockPackagePolicyService = { list: jest.fn() };
  const mockAgentPolicyService = { getByIds: jest.fn() };

  const callRoute = async (kuery: string) => {
    const mockResponse = httpServerMock.createResponseFactory();
    const request = httpServerMock.createKibanaRequest({
      query: { kuery, page: 1, perPage: 100, showInactive: false },
    });
    await routeHandler({} as never, request as never, mockResponse);

    return mockResponse;
  };

  const receivedKuery = (): string => mockListAgents.mock.calls[0][0].kuery;
  const receivedEsQuery = () =>
    JSON.stringify(toElasticsearchQuery(fromKueryExpression(receivedKuery())));

  beforeEach(() => {
    jest.clearAllMocks();

    mockPackagePolicyService.list.mockResolvedValue({
      items: [{ package: { version: '1.0.0' }, policy_ids: ['policy-1', 'policy-2'] }],
    });
    mockAgentPolicyService.getByIds.mockResolvedValue([
      { id: 'policy-1', name: 'Production Policy' },
      { id: 'policy-2', name: 'Osquery policy' },
    ]);
    mockListAgents.mockResolvedValue({ total: 0, agents: [], aggregations: undefined });

    const osqueryContext = {
      getStartServices: jest.fn(),
      service: {
        getAgentService: jest.fn().mockReturnValue({
          asInternalUser: { listAgents: mockListAgents },
        }),
        getPackagePolicyService: jest.fn().mockReturnValue(mockPackagePolicyService),
        getAgentPolicyService: jest.fn().mockReturnValue(mockAgentPolicyService),
      },
    } as unknown as OsqueryAppContext;

    const router = httpServiceMock.createSetupContract().createRouter();
    getAgentsRoute(router, osqueryContext);

    const routeVersion = router.versioned.getRoute('get', '/internal/osquery/fleet_wrapper/agents')
      .versions['1'];
    if (!routeVersion) {
      throw new Error('Handler for version [1] not found!');
    }

    routeHandler = routeVersion.handler;
  });

  it('passes a kuery without a policy_name clause through unchanged', async () => {
    const kuery = `${POLICY_SCOPE} and (status:online )`;
    await callRoute(kuery);

    expect(receivedKuery()).toBe(kuery);
  });

  it.each(['web', 'prod', 'nomatch', 'Production Policy'])(
    'sends Fleet a kuery it accepts for the picker search %p',
    async (searchValue) => {
      const mockResponse = await callRoute(buildPickerSearchKuery(searchValue));

      expect(mockResponse.badRequest).not.toHaveBeenCalled();
      expect(validateAgentKueryFields(receivedKuery())).toBeUndefined();
      expect(receivedKuery().startsWith(`${POLICY_SCOPE} and (`)).toBe(true);
    }
  );

  it('replaces the policy_name clause with the ids of the matching policies', async () => {
    await callRoute(buildPickerSearchKuery('policy'));

    expect(receivedKuery()).toContain(
      'local_metadata.os.platform: *policy* or policy_id:policy-1 or policy_id:policy-2 )'
    );
  });

  it('matches a multi-word policy name in full', async () => {
    await callRoute(buildPickerSearchKuery('Production Policy'));

    expect(receivedKuery()).toContain(
      'local_metadata.os.platform: *Production Policy* or policy_id:policy-1 )'
    );
    expect(receivedEsQuery()).toContain('{"match":{"policy_id":"policy-1"}}');
  });

  it('drops the policy_name clause when no policy matches, keeping the other search terms', async () => {
    await callRoute(buildPickerSearchKuery('nomatch'));

    expect(receivedKuery()).toBe(
      `${POLICY_SCOPE} and (local_metadata.host.hostname.keyword:*nomatch* or local_metadata.elastic.agent.id:*nomatch* or policy_id: *nomatch* or local_metadata.os.platform: *nomatch* )`
    );
  });
});
