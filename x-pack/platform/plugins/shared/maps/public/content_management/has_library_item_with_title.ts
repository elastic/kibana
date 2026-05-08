/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getMapClient } from './maps_client';

export const hasLibraryItemWithTitle = async (title: string) => {
  const { hits } = await getMapClient().search(
    {
      text: `"${title}"`,
      limit: 10,
    },
    { onlyTitle: true }
  );

  return hits.some((obj) => obj.attributes.title.toLowerCase() === title.toLowerCase());
};
