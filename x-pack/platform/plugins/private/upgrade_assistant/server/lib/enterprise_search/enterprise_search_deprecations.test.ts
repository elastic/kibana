/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DeprecationDetailsMessage, DeprecationsDetails } from '@kbn/core-deprecations-common';
import { GetDeprecationsContext } from '@kbn/core-deprecations-server';

import { getEnterpriseSearchPre8IndexDeprecations } from './enterprise_search_deprecations';
import indexDeprecatorFxns = require('./pre_eight_index_deprecator');

const ctx = {
  esClient: {
    asInternalUser: {},
  },
} as GetDeprecationsContext;

function getMessageFromDeprecation(details: DeprecationsDetails): string {
  const message = details.message as DeprecationDetailsMessage;
  return message.content;
}

describe('getEnterpriseSearchPre8IndexDeprecations', () => {
  it('can register index and data stream deprecations that need to be set to read only', async () => {
    const getIndicesMock = jest.fn(() =>
      Promise.resolve([
        {
          name: '.ent-search-index_without_datastream',
          hasDatastream: false,
          datastreams: [],
        },
        {
          name: '.ent-search-with_data_stream',
          hasDatastream: true,
          datastreams: ['datastream-testing'],
        },
      ])
    );

    jest
      .spyOn(indexDeprecatorFxns, 'getPreEightEnterpriseSearchIndices')
      .mockImplementation(getIndicesMock);

    const deprecations = await getEnterpriseSearchPre8IndexDeprecations(ctx, 'docsurl');
    expect(deprecations).toHaveLength(1);
    expect(deprecations[0].correctiveActions.api?.path).toStrictEqual(
      '/internal/enterprise_search/deprecations/set_enterprise_search_indices_read_only'
    );
    expect(deprecations[0].title).toMatch('Pre 8.x Enterprise Search indices compatibility');
    expect(getMessageFromDeprecation(deprecations[0])).toContain(
      'The following indices are found to be incompatible for upgrade'
    );
    expect(getMessageFromDeprecation(deprecations[0])).toContain(
      '.ent-search-index_without_datastream'
    );
    expect(getMessageFromDeprecation(deprecations[0])).toContain(
      'The following data streams are found to be incompatible for upgrade'
    );
    expect(getMessageFromDeprecation(deprecations[0])).toContain('.ent-search-with_data_stream');
  });

  it('can register an index without data stream deprecations that need to be set to read only', async () => {
    const getIndicesMock = jest.fn(() =>
      Promise.resolve([
        {
          name: '.ent-search-index_without_datastream',
          hasDatastream: false,
          datastreams: [''],
        },
      ])
    );

    jest
      .spyOn(indexDeprecatorFxns, 'getPreEightEnterpriseSearchIndices')
      .mockImplementation(getIndicesMock);

    const deprecations = await getEnterpriseSearchPre8IndexDeprecations(ctx, 'docsurl');
    expect(deprecations).toHaveLength(1);
    expect(deprecations[0].correctiveActions.api?.path).toStrictEqual(
      '/internal/enterprise_search/deprecations/set_enterprise_search_indices_read_only'
    );
    expect(deprecations[0].title).toMatch('Pre 8.x Enterprise Search indices compatibility');
    expect(getMessageFromDeprecation(deprecations[0])).toContain(
      'The following indices are found to be incompatible for upgrade'
    );
    expect(getMessageFromDeprecation(deprecations[0])).toContain(
      '.ent-search-index_without_datastream'
    );
    expect(getMessageFromDeprecation(deprecations[0])).not.toContain(
      'The following data streams are found to be incompatible for upgrade'
    );
    expect(getMessageFromDeprecation(deprecations[0])).not.toContain(
      '.ent-search-with_data_stream'
    );
  });
});
