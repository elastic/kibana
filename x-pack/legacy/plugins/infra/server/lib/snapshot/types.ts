/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { JsonObject } from '../../../common/typed_json';
import { InfraSourceConfiguration } from '../../../public/graphql/types';
import { SnapshotRequest } from '../../../common/http_api/snapshot_api';

export interface InfraSnapshotRequestOptions
  extends Omit<SnapshotRequest, 'sourceId' | 'filterQuery'> {
  sourceConfiguration: InfraSourceConfiguration;
  filterQuery: JsonObject | undefined;
}
