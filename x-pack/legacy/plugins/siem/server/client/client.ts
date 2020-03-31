/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Legacy } from 'kibana';

import {
  APP_ID,
  SIGNALS_INDEX_KEY,
  LISTS_INDEX_KEY,
  LISTS_ITEMS_INDEX_KEY,
} from '../../common/constants';

export class SiemClient {
  public readonly signalsIndex: string;
  public readonly listsIndex: string;
  public readonly listsItemsIndex: string;

  constructor(private spaceId: string, private config: Legacy.Server['config']) {
    const configuredSignalsIndex = this.config().get<string>(
      `xpack.${APP_ID}.${SIGNALS_INDEX_KEY}`
    );

    const configuredListsIndex = this.config().get<string>(`xpack.${APP_ID}.${LISTS_INDEX_KEY}`);

    const configuredListsItemsIndex = this.config().get<string>(
      `xpack.${APP_ID}.${LISTS_ITEMS_INDEX_KEY}`
    );

    this.signalsIndex = `${configuredSignalsIndex}-${this.spaceId}`;
    this.listsIndex = `${configuredListsIndex}-${this.spaceId}`;
    this.listsItemsIndex = `${configuredListsItemsIndex}-${this.spaceId}`;
  }
}
