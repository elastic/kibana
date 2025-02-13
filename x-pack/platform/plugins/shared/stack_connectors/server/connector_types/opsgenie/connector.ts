/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import crypto from 'crypto';
import { ServiceParams, SubActionConnector } from '@kbn/actions-plugin/server';
import { AxiosError } from 'axios';
import { isEmpty } from 'lodash';
import { ConnectorUsageCollector } from '@kbn/actions-plugin/server/types';
import { OpsgenieSubActions } from '../../../common';
import { CreateAlertParamsSchema, CloseAlertParamsSchema, Response } from './schema';
import { CloseAlertParams, Config, CreateAlertParams, FailureResponseType, Secrets } from './types';
import * as i18n from './translations';

export class OpsgenieConnector extends SubActionConnector<Config, Secrets> {
  constructor(params: ServiceParams<Config, Secrets>) {
    super(params);

    this.registerSubAction({
      method: this.createAlert.name,
      name: OpsgenieSubActions.CreateAlert,
      schema: CreateAlertParamsSchema,
    });

    this.registerSubAction({
      method: this.closeAlert.name,
      name: OpsgenieSubActions.CloseAlert,
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
   * When testing invalid requests with Opsgenie the response seems to take the form:
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
    const res = await this.request(
      {
        method: 'post',
        url: this.concatPathToURL('v2/alerts').toString(),
        data: { ...params, ...OpsgenieConnector.createAliasObj(params.alias) },
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

    const newAlias = OpsgenieConnector.createAlias(alias);

    return { alias: newAlias };
  }

  private static createAlias(alias: string) {
    // opsgenie v2 requires that the alias length be no more than 512 characters
    // see their docs for more details https://docs.opsgenie.com/docs/alert-api#create-alert
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
    const newAlias = OpsgenieConnector.createAlias(params.alias);

    const fullURL = this.concatPathToURL(`v2/alerts/${newAlias}/close`);
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
    const fullURL = new URL(path, this.config.apiUrl);

    return fullURL;
  }
}
