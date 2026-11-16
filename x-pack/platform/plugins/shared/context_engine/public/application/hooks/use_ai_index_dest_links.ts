/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DISCOVER_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import {
  INDEX_MANAGEMENT_LOCATOR_ID,
  type IndexManagementLocatorParams,
} from '@kbn/index-management-shared-types';
import { useLocatorUrl } from '@kbn/share-plugin/public';
import { useMemo } from 'react';
import { isIndexPattern } from '../../../common/ai_index_dest';
import type { AiIndexDest } from '../../../common/http_api/ai_indices';
import {
  getDiscoverEsqlQuery,
  getIndexManagementLocatorParams,
} from '../components/ki/list/list_ki_helpers';
import { useKibana } from './use_kibana';

export const useAiIndexDestLinks = (dest: AiIndexDest | undefined) => {
  const {
    services: { share, application },
  } = useKibana();

  const destValue = dest?.value ?? '';

  const canOpenDiscover = application.capabilities.discover_v2?.show === true;
  const discoverHref = useMemo(() => {
    if (!canOpenDiscover || dest === undefined) {
      return undefined;
    }
    const locator = share.url.locators.get(DISCOVER_APP_LOCATOR);
    return locator?.getRedirectUrl({
      timeRange: { from: 'now-90d', to: 'now' },
      query: { esql: getDiscoverEsqlQuery(dest.value) },
    });
  }, [canOpenDiscover, dest, share?.url?.locators]);

  const canOpenIndexManagement = application.capabilities.index_management?.monitor === true;
  const canLinkToIndexManagement =
    dest !== undefined && canOpenIndexManagement && !isIndexPattern(dest.value);
  const indexManagementLocator = canLinkToIndexManagement
    ? share.url.locators.get<IndexManagementLocatorParams>(INDEX_MANAGEMENT_LOCATOR_ID)
    : undefined;
  const indexManagementUrl = useLocatorUrl(
    indexManagementLocator,
    canLinkToIndexManagement
      ? getIndexManagementLocatorParams(dest)
      : { page: 'index_details' as const, indexName: '' },
    undefined,
    [dest, canLinkToIndexManagement]
  );
  const indexManagementHref =
    canLinkToIndexManagement && indexManagementUrl ? indexManagementUrl : undefined;

  return {
    destValue,
    discoverHref,
    indexManagementHref,
  };
};
