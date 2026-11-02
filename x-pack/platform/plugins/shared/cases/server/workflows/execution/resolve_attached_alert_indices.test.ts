/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import type { DocumentResponse } from '../../../common/types/api';
import { resolveAttachedAlertIndices } from './resolve_attached_alert_indices';

const ALIAS = '.alerts-security.alerts-default';
const BACKING_INDEX = '.internal.alerts-security.alerts-default-000001';
const ATTACHED_AT = '2026-08-26T00:00:00.000Z';

const attachedAlert = (id: string, index: string): DocumentResponse[number] => ({
  id,
  index,
  attached_at: ATTACHED_AT,
});

const searchHits = (...hits: Array<{ _id: string; _index: string }>) =>
  ({ hits: { hits } } as never);

describe('resolveAttachedAlertIndices', () => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();

  beforeEach(() => {
    jest.clearAllMocks();
    esClient.search.mockResolvedValue(searchHits());
  });

  it('returns the attached alerts without searching when every selection matches exactly', async () => {
    const attached = [attachedAlert('alert-1', BACKING_INDEX)];

    await expect(
      resolveAttachedAlertIndices({
        selected: [{ _id: 'alert-1', _index: BACKING_INDEX }],
        attached,
        esClient,
      })
    ).resolves.toBe(attached);
    expect(esClient.search).not.toHaveBeenCalled();
  });

  it('adds the concrete index an alias-stored alert resolves to', async () => {
    esClient.search.mockResolvedValueOnce(searchHits({ _id: 'alert-1', _index: BACKING_INDEX }));

    await expect(
      resolveAttachedAlertIndices({
        selected: [{ _id: 'alert-1', _index: BACKING_INDEX }],
        attached: [attachedAlert('alert-1', ALIAS)],
        esClient,
      })
    ).resolves.toEqual([attachedAlert('alert-1', ALIAS), attachedAlert('alert-1', BACKING_INDEX)]);
    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        index: ALIAS,
        size: 1,
        query: { ids: { values: ['alert-1'] } },
        _source: false,
        ignore_unavailable: true,
        allow_no_indices: true,
      })
    );
  });

  it('searches only the unmatched ids, once per stored index', async () => {
    const otherAlias = '.alerts-security.alerts-other';

    await resolveAttachedAlertIndices({
      selected: [
        { _id: 'alert-1', _index: BACKING_INDEX },
        { _id: 'alert-2', _index: BACKING_INDEX },
        { _id: 'alert-3', _index: BACKING_INDEX },
        { _id: 'alert-4', _index: BACKING_INDEX },
      ],
      attached: [
        attachedAlert('alert-1', BACKING_INDEX),
        attachedAlert('alert-2', ALIAS),
        attachedAlert('alert-3', ALIAS),
        attachedAlert('alert-4', otherAlias),
        attachedAlert('alert-5', ALIAS),
      ],
      esClient,
    });

    expect(esClient.search).toHaveBeenCalledTimes(2);
    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({ index: ALIAS, query: { ids: { values: ['alert-2', 'alert-3'] } } })
    );
    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({ index: otherAlias, query: { ids: { values: ['alert-4'] } } })
    );
  });

  it('ignores hits whose id is not an attached alert', async () => {
    esClient.search.mockResolvedValueOnce(searchHits({ _id: 'alert-99', _index: BACKING_INDEX }));
    const attached = [attachedAlert('alert-1', ALIAS)];

    await expect(
      resolveAttachedAlertIndices({
        selected: [{ _id: 'alert-1', _index: BACKING_INDEX }],
        attached,
        esClient,
      })
    ).resolves.toEqual(attached);
  });

  it('does not search a selection whose id is not attached to the case', async () => {
    await resolveAttachedAlertIndices({
      selected: [{ _id: 'alert-99', _index: BACKING_INDEX }],
      attached: [attachedAlert('alert-1', ALIAS)],
      esClient,
    });

    expect(esClient.search).not.toHaveBeenCalled();
  });

  it.each([
    ['an empty', ''],
    ['a remote', 'remote_cluster:.alerts-security.alerts-default'],
  ])('does not search %s stored index', async (_, index) => {
    await resolveAttachedAlertIndices({
      selected: [{ _id: 'alert-1', _index: BACKING_INDEX }],
      attached: [attachedAlert('alert-1', index)],
      esClient,
    });

    expect(esClient.search).not.toHaveBeenCalled();
  });

  it.each([
    ['a 403', { statusCode: 403 }],
    ['a security exception', { body: { error: { type: 'security_exception' } } }],
  ])('leaves the alert unresolved when the search is refused with %s', async (_, error) => {
    esClient.search.mockRejectedValueOnce(error);
    const attached = [attachedAlert('alert-1', ALIAS)];

    await expect(
      resolveAttachedAlertIndices({
        selected: [{ _id: 'alert-1', _index: BACKING_INDEX }],
        attached,
        esClient,
      })
    ).resolves.toEqual(attached);
  });

  it('rethrows other search failures', async () => {
    esClient.search.mockRejectedValueOnce(new Error('cluster unavailable'));

    await expect(
      resolveAttachedAlertIndices({
        selected: [{ _id: 'alert-1', _index: BACKING_INDEX }],
        attached: [attachedAlert('alert-1', ALIAS)],
        esClient,
      })
    ).rejects.toThrow('cluster unavailable');
  });
});
