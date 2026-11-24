/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsClient } from '@kbn/scout';

/**
 * The profiles, rules, indices, and data stream a suite tests with. Every name starts with the
 * suite's namespace, so suites sharing a server don't delete each other's data.
 */
export const getBoostTestData = (namespace: string) => {
  const indicesProfile = `${namespace}-fast`;
  const dataStreamsProfile = `${namespace}-recent`;

  const patternRule = `${namespace}-pattern`;
  const exactRule = `${namespace}-exact`;
  const dataStreamsRule = `${namespace}-logs`;
  const priorityExactRule = `${namespace}-priority-exact`;
  const priorityWildcardRule = `${namespace}-priority-wildcard`;

  const productsIndex = `${namespace}-boost-products`;
  const reviewsIndex = `${namespace}-boost-reviews`;
  const hiddenIndex = `${namespace}-boost-hidden`;
  const priorityIndex = `${namespace}-priority-orders`;
  const dataStream = `${namespace}-stream-default`;
  // The project's `logs-*-*` template can't be used here, so the data stream has its own.
  const dataStreamTemplate = `${namespace}-stream`;

  const profiles = {
    [indicesProfile]: {
      type: 'indices',
      min_boost: 1,
      max_boost: 2,
      availability: 'base',
      prewarm: true,
      pinned: false,
    },
    [dataStreamsProfile]: {
      type: 'data_streams',
      recent: { min_boost: 1, max_boost: 2, max_age: '1d' },
      standard: { min_boost: 1, max_boost: 1.5, max_age: '7d' },
      background: { min_boost: 1, max_boost: 1 },
    },
  };

  const rules = {
    [patternRule]: {
      index_pattern: `${namespace}-boost-*`,
      boost_profile: indicesProfile,
      priority: 0,
    },
    [exactRule]: { index_pattern: productsIndex, boost_profile: indicesProfile, priority: 0 },
    [dataStreamsRule]: {
      index_pattern: `${namespace}-stream-*`,
      boost_profile: dataStreamsProfile,
      priority: 0,
    },
    // A higher priority beats a more specific pattern.
    [priorityExactRule]: {
      index_pattern: priorityIndex,
      boost_profile: indicesProfile,
      priority: 0,
    },
    [priorityWildcardRule]: {
      index_pattern: `${namespace}-priority-*`,
      boost_profile: indicesProfile,
      priority: 5,
    },
  };

  const indices = [productsIndex, reviewsIndex, hiddenIndex, priorityIndex];

  const remove = async (esClient: EsClient) => {
    // Elasticsearch rejects deleting a profile that rules still use.
    for (const name of Object.keys(rules)) {
      await esClient.transport.request(
        { method: 'DELETE', path: `/_boost/rule/${name}` },
        { ignore: [404] }
      );
    }
    for (const name of Object.keys(profiles)) {
      await esClient.transport.request(
        { method: 'DELETE', path: `/_boost/profile/${name}` },
        { ignore: [404] }
      );
    }
    await esClient.indices.deleteDataStream({ name: dataStream }, { ignore: [404] });
    await esClient.indices.deleteIndexTemplate({ name: dataStreamTemplate }, { ignore: [404] });
    // Without `ignore_unavailable`, one missing index leaves the others in place.
    await esClient.indices.delete(
      { index: indices, expand_wildcards: 'all', ignore_unavailable: true },
      { ignore: [404] }
    );
  };

  const create = async (esClient: EsClient) => {
    for (const [name, body] of Object.entries(profiles)) {
      await esClient.transport.request({ method: 'PUT', path: `/_boost/profile/${name}`, body });
    }
    for (const [name, body] of Object.entries(rules)) {
      await esClient.transport.request({ method: 'PUT', path: `/_boost/rule/${name}`, body });
    }
    await esClient.indices.create({ index: productsIndex });
    await esClient.indices.create({ index: reviewsIndex });
    await esClient.indices.create({ index: hiddenIndex, settings: { 'index.hidden': true } });
    await esClient.indices.create({ index: priorityIndex });
    await esClient.indices.putIndexTemplate({
      name: dataStreamTemplate,
      index_patterns: [`${namespace}-stream-*`],
      data_stream: {},
      priority: 500,
    });
    await esClient.indices.createDataStream({ name: dataStream });
  };

  return {
    namespace,
    indicesProfile,
    dataStreamsProfile,
    patternRule,
    exactRule,
    dataStreamsRule,
    priorityExactRule,
    priorityWildcardRule,
    productsIndex,
    reviewsIndex,
    hiddenIndex,
    priorityIndex,
    dataStream,
    /** Removes anything a previous run left, then creates the data. */
    setUp: async (esClient: EsClient) => {
      await remove(esClient);
      await create(esClient);
    },
    tearDown: remove,
  };
};
