/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ACTION_TYPE_SOURCES } from '@kbn/actions-types';
import type { ConnectorSpecDetail, ConnectorSpecSummary } from '../../common/connector_spec';
import { ConnectorAuditAction, connectorAuditEvent } from '../lib/audit_events';
import { getRegisteredSpec } from './lib/get_registered_spec';
import { serializeSpecDetail } from './lib/serialize_spec_detail';
import { serializeSpecSummary } from './lib/serialize_spec_summary';
import type { GetAllSpecsParams, GetSpecParams, ISpecsClient, SpecsClientOpts } from './types';

export class SpecsClient implements ISpecsClient {
  constructor(private readonly opts: SpecsClientOpts) {}

  public async get({ id }: GetSpecParams): Promise<ConnectorSpecDetail> {
    await this.ensureAuthorized();
    const registered = getRegisteredSpec(this.opts.actionTypeRegistry, id);
    return serializeSpecDetail(registered, this.opts.configurationUtilities);
  }

  public async getAll({ featureId }: GetAllSpecsParams = {}): Promise<ConnectorSpecSummary[]> {
    await this.ensureAuthorized();
    const { actionTypeRegistry } = this.opts;
    return actionTypeRegistry.list({ featureId }).flatMap((type) => {
      if (type.source !== ACTION_TYPE_SOURCES.spec) {
        return [];
      }
      const spec = actionTypeRegistry.getSpec(type.id);
      if (!spec) {
        return [];
      }
      return [serializeSpecSummary({ spec, type })];
    });
  }

  private async ensureAuthorized(): Promise<void> {
    if (this.opts.access.kind !== 'request') {
      return;
    }

    const { authorization, auditLogger } = this.opts.access;
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
