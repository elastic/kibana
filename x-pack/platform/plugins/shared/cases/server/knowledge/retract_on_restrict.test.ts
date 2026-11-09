/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { subscribeRetractOutcomeOnRestrict } from './retract_on_restrict';

const setup = () => {
  let listener: (event: unknown, cases: unknown) => Promise<void> = async () => {};
  const eventBus = { onCaseUpdated: jest.fn((fn) => (listener = fn)) };
  const esClient = { deleteByQuery: jest.fn().mockResolvedValue({ deleted: 1 }) };
  subscribeRetractOutcomeOnRestrict({
    eventBus: eventBus as never,
    getEsClient: async () => esClient as never,
    logger: loggingSystemMock.createLogger(),
  });
  return {
    esClient,
    fire: (previous: string, updated: string) =>
      listener(
        {},
        {
          previousCase: { attributes: { access: { mode: previous } } },
          updatedCase: { id: 'case-1', access: { mode: updated } },
        }
      ),
  };
};

describe('subscribeRetractOutcomeOnRestrict', () => {
  it('deletes the published outcome when a case becomes restricted', async () => {
    const { esClient, fire } = setup();

    await fire('default', 'restricted');

    expect(esClient.deleteByQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        index: 'ai-index-idx-cases-outcomes',
        query: { term: { id: 'case:case-1' } },
        ignore_unavailable: true,
      })
    );
  });

  it('does nothing for other changes', async () => {
    const { esClient, fire } = setup();

    await fire('default', 'default');
    await fire('restricted', 'restricted');

    expect(esClient.deleteByQuery).not.toHaveBeenCalled();
  });
});
