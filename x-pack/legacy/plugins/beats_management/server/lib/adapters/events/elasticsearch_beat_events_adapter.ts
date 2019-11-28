/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { BeatEvent } from '../../../../common/domain_types';
import { FrameworkUser } from '../../../../public/lib/adapters/framework/adapter_types';
import { DatabaseAdapter } from '../database/adapter_types';
import { BeatEventsAdapter } from './adapter_types';

export class ElasticsearchBeatEventsAdapter implements BeatEventsAdapter {
  // @ts-ignore
  constructor(private readonly database: DatabaseAdapter) {}

  // eslint-disable-next-line
  public bulkInsert = async (user: FrameworkUser, beatId: string, events: BeatEvent[]) => {
    // await this.database.putTemplate(INDEX_NAMES.EVENTS_TODAY, beatsIndexTemplate);
  };
}
