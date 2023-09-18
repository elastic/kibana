/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ApmSynthtraceEsClient, ApmSynthtraceKibanaClient } from '@kbn/apm-synthtrace';
import Url from 'url';
import { Readable } from 'stream';
import { ApmFields, SynthtraceGenerator } from '@kbn/apm-synthtrace-client';

export interface SynthtraceClientParams {
  kbnBaseUrl: string;
  logger: any;
  username: string;
  password: string;
  esClient: any;
}

export class SynthtraceClient {
  private synthtraceEsClient: ApmSynthtraceEsClient | undefined;
  private packageVersion: string = '';
  private readonly kibanaUrlWithAuth: string;

  constructor(private readonly baseParams: SynthtraceClientParams) {
    const kibanaUrl = new URL(this.baseParams.kbnBaseUrl);
    this.kibanaUrlWithAuth = Url.format({
      protocol: kibanaUrl.protocol,
      hostname: kibanaUrl.hostname,
      port: kibanaUrl.port,
      auth: `${this.baseParams.username}:${this.baseParams.password}`,
    });
  }

  async installApmPackage() {
    const kibanaClient = new ApmSynthtraceKibanaClient({
      logger: this.baseParams.logger,
      target: this.kibanaUrlWithAuth,
    });
    this.packageVersion = await kibanaClient.fetchLatestApmPackageVersion();

    await kibanaClient.installApmPackage(this.packageVersion);
  }

  async initialiseEsClient() {
    this.synthtraceEsClient = new ApmSynthtraceEsClient({
      client: this.baseParams.esClient,
      logger: this.baseParams.logger,
      refreshAfterIndex: true,
      version: this.packageVersion,
    });

    this.synthtraceEsClient.pipeline(this.synthtraceEsClient.getDefaultPipeline(false));
  }

  async index(events: SynthtraceGenerator<ApmFields>) {
    if (this.synthtraceEsClient) {
      await this.synthtraceEsClient.index(
        Readable.from(Array.from(events).flatMap((event) => event.serialize()))
      );
    } else {
      throw new Error('ES Client not initialised');
    }
  }
}
