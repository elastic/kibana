/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { BeatEvent } from '../../../../common/domain_types';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { FrameworkUser } from '../../../../../../../plugins/beats_management/public/lib/adapters/framework/adapter_types';

export interface BeatEventsAdapter {
  bulkInsert(user: FrameworkUser, beatId: string, events: BeatEvent[]): Promise<void>;
}
