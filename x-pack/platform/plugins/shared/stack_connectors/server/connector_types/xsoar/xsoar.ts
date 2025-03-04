/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { ServiceParams, SubActionConnector } from '@kbn/actions-plugin/server';
import { ConnectorUsageCollector } from '@kbn/actions-plugin/server/types';
import type { AxiosError } from 'axios';

import type {
  Config,
  Secrets,
  XSOARRunActionParams,
  XSOARPlaybooksActionResponse,
} from '../../../common/xsoar/types';
import {
  XSOARRunActionResponseSchema,
  XSOARPlaybooksActionResponseSchema,
  XSOARPlaybooksActionParamsSchema,
  XSOARRunActionParamsSchema,
} from '../../../common/xsoar/schema';
import { SUB_ACTION } from '../../../common/xsoar/constants';

export const CLOUD_API_PATH = '/xsoar/public/v1';
export const INCIDENT_PATH = '/incident';
export const PLAYBOOKS_PATH = '/playbook/search';

export class XSOARConnector extends SubActionConnector<Config, Secrets> {
  private urls: {
    playbooks: string;
    incident: string;
  };
  private isCloud: boolean;

  constructor(params: ServiceParams<Config, Secrets>) {
    super(params);

    this.isCloud = this.secrets.apiKeyID !== null && this.secrets.apiKeyID !== '';
    this.urls = {
      playbooks: this.isCloud
        ? `${this.config.url}${CLOUD_API_PATH}${PLAYBOOKS_PATH}`
        : `${this.config.url}${PLAYBOOKS_PATH}`,
      incident: this.isCloud
        ? `${this.config.url}${CLOUD_API_PATH}${INCIDENT_PATH}`
        : `${this.config.url}${INCIDENT_PATH}`,
    };

    this.registerSubActions();
  }

  private registerSubActions() {
    this.registerSubAction({
      name: SUB_ACTION.PLAYBOOKS,
      method: 'getPlaybooks',
      schema: XSOARPlaybooksActionParamsSchema,
    });

    this.registerSubAction({
      name: SUB_ACTION.RUN,
      method: 'run',
      schema: XSOARRunActionParamsSchema,
    });
  }

  private getAuthHeaders() {
    return this.isCloud
      ? { Authorization: this.secrets.apiKey, 'x-xdr-auth-id': this.secrets.apiKeyID }
      : { Authorization: this.secrets.apiKey };
  }

  protected getResponseErrorMessage(error: AxiosError): string {
    if (error.response?.statusText) {
      return `API Error: ${error.response?.statusText}`;
    }
    return error.toString();
  }

  private formatIncidentBody(incident: XSOARRunActionParams) {
    try {
      const { body, ...incidentWithoutBody } = incident;
      const bodyJson = JSON.parse(body ?? '{}');
      const mergedIncident = { ...bodyJson, ...incidentWithoutBody };

      return mergedIncident;
    } catch (err) {
      throw new Error(
        i18n.translate('xpack.stackConnectors.xsoar.incidentBodyParsingError', {
          defaultMessage: 'Error parsing incident body for xSOAR: {err}',
          values: {
            err: err.toString(),
          },
        })
      );
    }
  }

  public async run(
    incident: XSOARRunActionParams,
    connectorUsageCollector: ConnectorUsageCollector
  ) {
    const mergedIncident = this.formatIncidentBody(incident);
    await this.request(
      {
        method: 'post',
        url: `${this.urls.incident}`,
        data: mergedIncident,
        headers: this.getAuthHeaders(),
        responseSchema: XSOARRunActionResponseSchema,
      },
      connectorUsageCollector
    );
  }

  public async getPlaybooks(
    params: unknown,
    connectorUsageCollector: ConnectorUsageCollector
  ): Promise<XSOARPlaybooksActionResponse> {
    const res = await this.request(
      {
        method: 'post',
        url: `${this.urls.playbooks}`,
        data: {},
        headers: this.getAuthHeaders(),
        responseSchema: XSOARPlaybooksActionResponseSchema,
      },
      connectorUsageCollector
    );

    return res.data;
  }
}
