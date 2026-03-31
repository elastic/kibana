/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { deleteConnectorById, getConnectorIdAsUuid } from '@kbn/evals';
import { getAvailableConnectors } from '@kbn/gen-ai-functional-testing';
import { evaluate } from '../../src/evaluate';

evaluate(
  'Disable streams and clean up',
  { tag: tags.stateful.classic },
  async ({ apiServices, esClient, fetch, log }) => {
    await apiServices.streams.disable();

    const connectors = getAvailableConnectors();
    for (const connector of connectors) {
      await deleteConnectorById({
        fetch,
        connectorId: getConnectorIdAsUuid(connector.id),
        log,
      });
    }

    await esClient.indices.deleteDataStream({
      name: 'logs*',
    });
  }
);
