/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConnectorSpecDetail } from '../../common/connector_spec';
import { ConnectorAuditAction, connectorAuditEvent } from '../lib/audit_events';
import { getRegisteredSpec } from './lib/get_registered_spec';
import { serializeSpecDetail } from './lib/serialize_spec_detail';
import type { GetSpecParams, ISpecsClient, SpecsClientOpts } from './types';

export class SpecsClient implements ISpecsClient {
  constructor(private readonly opts: SpecsClientOpts) {}

  public async get({ id }: GetSpecParams): Promise<ConnectorSpecDetail> {
    await this.ensureAuthorized();
    const registered = getRegisteredSpec(this.opts.actionTypeRegistry, id);
    return serializeSpecDetail(registered, this.opts.configurationUtilities);
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
