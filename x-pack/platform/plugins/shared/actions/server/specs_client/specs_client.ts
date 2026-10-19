/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConnectorSpecDetail, ConnectorSpecSummary } from '../../common/connector_spec';
import { ConnectorAuditAction, connectorAuditEvent } from '../lib/audit_events';
import { getSpecDetail } from './lib/get_spec_detail';
import { listSpecSummaries } from './lib/list_spec_summaries';
import type { GetAllSpecsParams, GetSpecParams, ISpecsClient, SpecsClientOpts } from './types';

export class SpecsClient implements ISpecsClient {
  constructor(private readonly opts: SpecsClientOpts) {}

  public async get({ id }: GetSpecParams): Promise<ConnectorSpecDetail> {
    await this.ensureAuthorized();
    return getSpecDetail(this.opts, id);
  }

  public async getAll(params: GetAllSpecsParams = {}): Promise<ConnectorSpecSummary[]> {
    await this.ensureAuthorized();
    return listSpecSummaries(this.opts, params);
  }

  private async ensureAuthorized(): Promise<void> {
    const { authorization, auditLogger } = this.opts;
    try {
      await authorization.ensureAuthorized({ operation: 'get' });
    } catch (error) {
      auditLogger?.log(
        connectorAuditEvent({
          action: ConnectorAuditAction.GET,
          error,
        })
      );
      throw error;
    }
  }
}
