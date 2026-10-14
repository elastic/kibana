/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expectParseError, expectParseSuccess } from '@kbn/zod-helpers/v4';
import { createOrUpdateAgentConfigurationRoute } from './create_or_update_configuration';
import { deleteAgentConfigurationRoute } from './delete_configuration';
import { agentConfigurationAgentNameRoute } from './get_agent_name';
import { getSingleAgentConfigurationRoute } from './get_single_configuration';
import { listAgentConfigurationEnvironmentsRoute } from './list_environments';
import { searchAgentConfigurationRoute } from './search_configuration';

describe('deleteAgentConfigurationRoute params', () => {
  it('accepts a partial service', () => {
    const result = deleteAgentConfigurationRoute.params!.safeParse({
      body: { service: { name: 'opbeans-java' } },
    });

    expectParseSuccess(result);
  });

  it('accepts an empty service', () => {
    expectParseSuccess(deleteAgentConfigurationRoute.params!.safeParse({ body: { service: {} } }));
  });
});

describe('agentConfigurationAgentNameRoute params', () => {
  it('accepts a serviceName', () => {
    const result = agentConfigurationAgentNameRoute.params!.safeParse({
      query: { serviceName: 'opbeans-java' },
    });

    expectParseSuccess(result);
  });

  it('rejects a missing serviceName', () => {
    expectParseError(agentConfigurationAgentNameRoute.params!.safeParse({ query: {} }));
  });
});

describe('getSingleAgentConfigurationRoute params', () => {
  it('allows an entirely missing query', () => {
    expectParseSuccess(getSingleAgentConfigurationRoute.params!.safeParse({}));
  });

  it('accepts a partial service query', () => {
    const result = getSingleAgentConfigurationRoute.params!.safeParse({
      query: { name: 'opbeans-java', environment: 'production' },
    });

    expectParseSuccess(result);
  });
});

describe('listAgentConfigurationEnvironmentsRoute params', () => {
  it('allows an entirely missing query', () => {
    expectParseSuccess(listAgentConfigurationEnvironmentsRoute.params!.safeParse({}));
  });

  it('accepts an optional serviceName', () => {
    const result = listAgentConfigurationEnvironmentsRoute.params!.safeParse({
      query: { serviceName: 'opbeans-java' },
    });

    expectParseSuccess(result);
  });
});

describe('searchAgentConfigurationRoute params', () => {
  it('accepts a body with just a service', () => {
    const result = searchAgentConfigurationRoute.params!.safeParse({
      body: { service: { name: 'opbeans-java' } },
    });

    expectParseSuccess(result);
  });

  it('accepts optional etag/mark_as_applied_by_agent/error', () => {
    const result = searchAgentConfigurationRoute.params!.safeParse({
      body: {
        service: { name: 'opbeans-java' },
        etag: 'abc',
        mark_as_applied_by_agent: true,
        error: 'boom',
      },
    });

    expectParseSuccess(result);
  });

  it('rejects a missing service', () => {
    expectParseError(searchAgentConfigurationRoute.params!.safeParse({ body: {} }));
  });
});

describe('createOrUpdateAgentConfigurationRoute params', () => {
  it('accepts a valid body without a query', () => {
    const result = createOrUpdateAgentConfigurationRoute.params!.safeParse({
      body: {
        service: { name: 'opbeans-java', environment: 'production' },
        settings: { transaction_sample_rate: '0.5' },
      },
    });

    expectParseSuccess(result);
  });

  it('coerces the optional overwrite query param from a string', () => {
    const result = createOrUpdateAgentConfigurationRoute.params!.safeParse({
      query: { overwrite: 'true' },
      body: { service: {}, settings: {} },
    });

    expectParseSuccess(result);
  });

  it('rejects a body with an out-of-range known setting', () => {
    expectParseError(
      createOrUpdateAgentConfigurationRoute.params!.safeParse({
        body: { service: {}, settings: { transaction_sample_rate: '5' } },
      })
    );
  });

  it('rejects a body missing settings', () => {
    expectParseError(
      createOrUpdateAgentConfigurationRoute.params!.safeParse({ body: { service: {} } })
    );
  });
});
