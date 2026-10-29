/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import type { HttpStart } from '@kbn/core/public';
import { CoreStart } from '@kbn/core-di-browser';
import { buildPath } from '@kbn/core-http-browser';
import {
  ALERTING_V2_INTERNAL_IMPORT_API_PATH,
  ALERTING_V2_INTERNAL_IMPORT_STATS_API_PATH,
} from '@kbn/alerting-v2-constants';
import {
  createImportResponseSchema,
  findImportsResponseSchema,
  importCredentialsResponseSchema,
  importResponseSchema,
  importStatsResponseSchema,
  testImportResponseSchema,
} from '@kbn/alerting-v2-schemas';
import type {
  CreateAnyImportData,
  CreateImportResponse,
  FindImportsRequest,
  FindImportsResponse,
  ImportCredentialsResponse,
  ImportResponse,
  ImportStatsResponse,
  TestImportRequest,
  TestImportResponse,
  UpdateImportData,
} from '@kbn/alerting-v2-schemas';

/**
 * POC: client for the custom import routes. Every response is parsed with the shared zod schemas
 * so a server/client mismatch fails loudly instead of rendering undefined.
 */
const buildImportPath = (id: string, action?: string): string =>
  buildPath(
    action
      ? `${ALERTING_V2_INTERNAL_IMPORT_API_PATH}/{id}/${action}`
      : `${ALERTING_V2_INTERNAL_IMPORT_API_PATH}/{id}`,
    { id }
  );

@injectable()
export class ImportsApi {
  constructor(@inject(CoreStart('http')) private readonly http: HttpStart) {}

  public async listImports(params: FindImportsRequest = {}): Promise<FindImportsResponse> {
    const response = await this.http.get(ALERTING_V2_INTERNAL_IMPORT_API_PATH, {
      query: {
        page: params.page,
        per_page: params.per_page,
        search: params.search || undefined,
      },
    });
    return findImportsResponseSchema.parse(response);
  }

  public async getImport(id: string): Promise<ImportResponse> {
    return importResponseSchema.parse(await this.http.get(buildImportPath(id)));
  }

  public async getImportStats(): Promise<ImportStatsResponse> {
    return importStatsResponseSchema.parse(
      await this.http.post(ALERTING_V2_INTERNAL_IMPORT_STATS_API_PATH)
    );
  }

  public async createImport(data: CreateAnyImportData): Promise<CreateImportResponse> {
    return createImportResponseSchema.parse(
      await this.http.post(ALERTING_V2_INTERNAL_IMPORT_API_PATH, { body: JSON.stringify(data) })
    );
  }

  public async updateImport(id: string, data: UpdateImportData): Promise<ImportResponse> {
    return importResponseSchema.parse(
      await this.http.patch(buildImportPath(id), { body: JSON.stringify(data) })
    );
  }

  public async deleteImport(id: string, deleteResources: boolean): Promise<void> {
    await this.http.delete(buildImportPath(id), { query: { deleteResources } });
  }

  public async rotateImportToken(id: string): Promise<ImportCredentialsResponse> {
    return importCredentialsResponseSchema.parse(
      await this.http.post(buildImportPath(id, '_rotate_token'))
    );
  }

  /** Writes a real alert: the workflow runs against the import's own webhook connector. */
  public async testImport(id: string, data: TestImportRequest = {}): Promise<TestImportResponse> {
    return testImportResponseSchema.parse(
      await this.http.post(buildImportPath(id, '_test'), { body: JSON.stringify(data) })
    );
  }
}
