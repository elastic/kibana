/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Capabilities } from '@kbn/core/public';
import type { LocatorPublic, SharePluginStart } from '@kbn/share-plugin/public';
import { DISCOVER_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import type { SerializableRecord } from '@kbn/utility-types';

export interface DiscoverEsqlLinkParams extends SerializableRecord {
  query: { esql: string };
}

export const getDiscoverLocator = (
  capabilities: Capabilities,
  share?: SharePluginStart
): LocatorPublic<DiscoverEsqlLinkParams> | undefined =>
  capabilities.discover_v2?.show
    ? share?.url.locators.get<DiscoverEsqlLinkParams>(DISCOVER_APP_LOCATOR)
    : undefined;
