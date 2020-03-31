/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ScopedClusterClient } from '../../../../../../../../src/core/server';

export const createListItemsBulk = async ({
  listId,
  ips,
  clusterClient,
  listsItemsIndex,
}: {
  listId: string;
  ips: string[] | undefined;
  clusterClient: Pick<ScopedClusterClient, 'callAsCurrentUser' | 'callAsInternalUser'>;
  listsItemsIndex: string;
}): Promise<void> => {
  if (ips == null || !ips.length) {
    return;
  }
  const createdAt = new Date().toISOString();

  const data = ips.reduce<Array<{}>>((accum, ip) => {
    return [
      ...accum,
      { create: { _index: listsItemsIndex } },
      { list_id: listId, ip, created_at: createdAt },
    ];
  }, []);

  await clusterClient.callAsCurrentUser('bulk', {
    body: data,
    index: listsItemsIndex,
  });
};
