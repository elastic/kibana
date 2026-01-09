/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import crypto from 'crypto';
import type { ServiceParams } from '@kbn/actions-plugin/server';
import { SubActionConnector } from '@kbn/actions-plugin/server';
import type { AxiosError } from 'axios';
import { isEmpty } from 'lodash';
import type { ConnectorUsageCollector } from '@kbn/actions-plugin/server/types';
import {
  SUB_ACTION,
  CloseAlertParamsSchema,
  CreateAlertParamsSchema,
  Response,
} from '@kbn/connector-schemas/jira-service-management';
import type {
  CloseAlertParams,
  Config,
  CreateAlertParams,
  FailureResponseType,
  Secrets,
} from '@kbn/connector-schemas/jira-service-management';
import * as i18n from './translations';

const INTEGRATION_API_BASE_PATH = 'jsm/ops/integration/v2';

export class JiraServiceManagementConnector extends SubActionConnector<Config, Secrets> {
  constructor(params: ServiceParams<Config, Secrets>) {
    super(params);

    this.registerSubAction({
      method: this.createAlert.name,
      name: SUB_ACTION.CreateAlert,
      schema: CreateAlertParamsSchema,
    });

    this.registerSubAction({
      method: this.closeAlert.name,
      name: SUB_ACTION.CloseAlert,
      schema: CloseAlertParamsSchema,
    });
  }

  public getResponseErrorMessage(error: AxiosError<FailureResponseType>) {
    const mainMessage = error.response?.data.message ?? error.message ?? i18n.UNKNOWN_ERROR;

    if (error.response?.data?.errors != null) {
      const message = this.getDetailedErrorMessage(error.response?.data?.errors);
      if (!isEmpty(message)) {
        return `${mainMessage}: ${message}`;
      }
    }

    return mainMessage;
  }

  /**
   * When testing invalid requests with JiraServiceManagement the response seems to take the form:
   * {
   *   ['field that is invalid']: 'message about what the issue is'
   * }
   *
   * e.g.
   *
   * {
   *   "message": "Message can not be empty.",
   *   "username": "must be a well-formed email address"
   * }
   *
   * So we'll just stringify it.
   */
  private getDetailedErrorMessage(errorField: unknown) {
    try {
      return JSON.stringify(errorField);
    } catch (error) {
      return;
    }
  }

  public async createAlert(
    params: CreateAlertParams,
    connectorUsageCollector: ConnectorUsageCollector
  ) {
    const url = this.concatPathToURL(`${INTEGRATION_API_BASE_PATH}/alerts`).toString();
    const res = await this.request(
      {
        method: 'post',
        url,
        data: { ...params, ...JiraServiceManagementConnector.createAliasObj(params.alias) },
        headers: this.createHeaders(),
        responseSchema: Response,
      },
      connectorUsageCollector
    );

    return res.data;
  }

  private static createAliasObj(alias?: string) {
    if (!alias) {
      return {};
    }

    const newAlias = JiraServiceManagementConnector.createAlias(alias);

    return { alias: newAlias };
  }

  private static createAlias(alias: string) {
    // JSM requires that the alias length be no more than 512 characters
    // see their docs for more details https://developer.atlassian.com/cloud/jira/service-desk-ops/rest/v2/api-group-alerts/#api-v1-alerts-post-request
    if (alias.length <= 512) {
      return alias;
    }

    // To give preference to avoiding collisions we're using sha256 over of md5 but we are compromising on speed a bit here
    const hasher = crypto.createHash('sha256');
    const sha256Hash = hasher.update(alias);

    return `sha-${sha256Hash.digest('hex')}`;
  }

  private createHeaders() {
    return { Authorization: `GenieKey ${this.secrets.apiKey}` };
  }

  public async closeAlert(
    params: CloseAlertParams,
    connectorUsageCollector: ConnectorUsageCollector
  ) {
    const newAlias = JiraServiceManagementConnector.createAlias(params.alias);

    const fullURL = this.concatPathToURL(`${INTEGRATION_API_BASE_PATH}/alerts/${newAlias}/close`);
    fullURL.searchParams.set('identifierType', 'alias');

    const { alias, ...paramsWithoutAlias } = params;

    const res = await this.request(
      {
        method: 'post',
        url: fullURL.toString(),
        data: paramsWithoutAlias,
        headers: this.createHeaders(),
        responseSchema: Response,
      },
      connectorUsageCollector
    );

    return res.data;
  }

  private concatPathToURL(path: string) {
    return new URL(path, this.config.apiUrl);
  }
}
