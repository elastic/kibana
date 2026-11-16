/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UserContentCommonSchema } from '@kbn/content-management-table-list-view-common';
import type { TableListViewFindItemsFn } from '@kbn/content-list-provider-client';

import type { MapItem } from '../../../common/content_management';
import { getMapClient } from '../../content_management';

export interface MapUserContent extends UserContentCommonSchema {
  type: string;
  attributes: {
    title: string;
  };
}

const toContentListItem = (mapItem: MapItem): MapUserContent => {
  return {
    ...mapItem,
    updatedAt: mapItem.updatedAt!,
    attributes: {
      ...mapItem.attributes,
      title: mapItem.attributes.title ?? '',
    },
  };
};

/**
 * Fetches maps for the listing.
 *
 * Tag filters arrive as `references` / `referencesToExclude` and are forwarded
 * to the server, which applies them before `limit`
 */
export const findItems: TableListViewFindItemsFn = async (
  searchTerm,
  { listingLimit: limit, references, referencesToExclude } = {}
) => {
  const included = references?.map(({ id }) => id);
  const excluded = referencesToExclude?.map(({ id }) => id);
  const tags = included?.length || excluded?.length ? { included, excluded } : undefined;

  try {
    const {
      hits,
      pagination: { total },
    } = await getMapClient().search({
      text: searchTerm ? `${searchTerm}*` : undefined,
      limit,
      ...(tags && { tags }),
    });

    return {
      hits: hits.map(toContentListItem),
      total,
    };
  } catch {
    return { total: 0, hits: [] };
  }
};
