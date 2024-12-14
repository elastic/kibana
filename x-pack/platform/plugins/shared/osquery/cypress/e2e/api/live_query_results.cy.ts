/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { request } from '../../tasks/common';
import { loadLiveQuery } from '../../tasks/api_fixtures';
import { API_VERSIONS } from '../../../common/constants';
import { ServerlessRoleName } from '../../support/roles';

describe('Live query', { tags: ['@ess', '@serverless'] }, () => {
  let liveQueryId: string;
  let queriesQueryActionId: string;

  beforeEach(() => {
    cy.login(ServerlessRoleName.SOC_MANAGER);
    loadLiveQuery().then((liveQuery) => {
      liveQueryId = liveQuery.action_id;
      queriesQueryActionId = liveQuery.queries?.[0].action_id;
    });
  });

  context('GET getLiveQueryDetailsRoute', () => {
    it('validates we get successful response', () => {
      request({
        url: `/api/osquery/live_queries/${liveQueryId}`,
        headers: {
          'Elastic-Api-Version': API_VERSIONS.public.v1,
        },
      }).then((response) => {
        expect(response.status).to.eq(200);
      });
    });
  });
  context('GET getLiveQueryResultsRoute', () => {
    it('validates we get successful response', () => {
      request({
        url: `/api/osquery/live_queries/${liveQueryId}/results/${queriesQueryActionId}`,
        headers: {
          'Elastic-Api-Version': API_VERSIONS.public.v1,
        },
      }).then((response) => {
        expect(response.status).to.eq(200);
      });
    });
  });
});
