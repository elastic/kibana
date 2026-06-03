/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SerializableRecord } from '@kbn/utility-types';
import type { LocatorDefinition, LocatorPublic } from '@kbn/share-plugin/common';
import { encode as encodeRison } from '@kbn/rison';
import {
  DEFAULT_EPISODES_LIST_STATUS,
  EPISODES_LIST_APP_STATE_KEY,
  encodeEpisodesListRecord,
} from './episodes_list_url_state';

export const EPISODES_LIST_LOCATOR_ID = 'ALERTING_V2_EPISODES_LIST_LOCATOR';

/**
 * Route segments owned by this locator. These mirror the management section /
 * app ids registered in the plugin's public setup (`public/constants.ts` /
 * `public/index.ts`); the locator is the canonical builder of episodes-list
 * deep links.
 */
const MANAGEMENT_APP_ID = 'management';
const ALERTING_V2_SECTION_ID = 'alertingV2';
const ALERTING_V2_EPISODES_APP_ID = 'episodes';

export interface EpisodesListLocatorParams extends SerializableRecord {
  /** Narrow the list to a single rule. */
  ruleId?: string;
  /**
   * Episode status filter. `'all'` shows every status; omit for the default
   * (active). Any other value selects that single status.
   */
  status?: string;
  /** Full-text search applied to the list. */
  queryString?: string;
  /** Tag values — episodes matching any selected tag (OR). */
  tags?: string[];
  /** Last-assignee user profile UID. */
  assigneeUid?: string;
  /** Time range embedded in `_a.episodesList.{timeFrom,timeTo}`. */
  timeRange?: { from: string; to: string };
}

export type EpisodesListLocator = LocatorPublic<EpisodesListLocatorParams>;

export class EpisodesListLocatorDefinition implements LocatorDefinition<EpisodesListLocatorParams> {
  public readonly id = EPISODES_LIST_LOCATOR_ID;

  public readonly getLocation = async (params: EpisodesListLocatorParams) => {
    const { ruleId, status, queryString, tags, assigneeUid, timeRange } = params;

    const record = encodeEpisodesListRecord({
      ruleId,
      // An unspecified status means "use the list default" (active), so it is
      // coalesced to the default and omitted from the URL. Pass `'all'`
      // explicitly to show every status. (In page filter state, by contrast, an
      // absent status means "all" — hence the translation here.)
      status: status ?? DEFAULT_EPISODES_LIST_STATUS,
      queryString,
      tags,
      assigneeUid,
      timeRange,
    });

    const basePath = `/${ALERTING_V2_SECTION_ID}/${ALERTING_V2_EPISODES_APP_ID}`;
    let path = basePath;
    if (Object.keys(record).length > 0) {
      const search = new URLSearchParams();
      search.set('_a', encodeRison({ [EPISODES_LIST_APP_STATE_KEY]: record }));
      path = `${basePath}?${search.toString()}`;
    }

    return {
      app: MANAGEMENT_APP_ID,
      path,
      state: {},
    };
  };
}
