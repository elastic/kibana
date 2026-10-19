/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConnectorSpecDetail, ConnectorSpecSummary } from '../../common/connector_spec';
import { getSpecDetail } from './lib/get_spec_detail';
import { listSpecSummaries } from './lib/list_spec_summaries';
import type {
  GetAllSpecsParams,
  GetSpecParams,
  ISpecsClient,
  UnsecuredSpecsClientOpts,
} from './types';

export class UnsecuredSpecsClient implements ISpecsClient {
  constructor(private readonly opts: UnsecuredSpecsClientOpts) {}

  public async get({ id }: GetSpecParams): Promise<ConnectorSpecDetail> {
    return getSpecDetail(this.opts, id);
  }

  public async getAll(params: GetAllSpecsParams = {}): Promise<ConnectorSpecSummary[]> {
    return listSpecSummaries(this.opts, params);
  }
}
