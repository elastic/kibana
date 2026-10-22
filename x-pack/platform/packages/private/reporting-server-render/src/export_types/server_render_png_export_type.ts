/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LicenseType } from '@kbn/licensing-types';
import {
  LICENSE_TYPE_CLOUD_STANDARD,
  LICENSE_TYPE_ENTERPRISE,
  LICENSE_TYPE_GOLD,
  LICENSE_TYPE_PLATINUM,
  LICENSE_TYPE_TRIAL,
} from '@kbn/reporting-common';
import type { TaskRunResult } from '@kbn/reporting-common/types';
import type { RunTaskOpts } from '@kbn/reporting-server';
import { ExportType } from '@kbn/reporting-server';
import { rasterizePageToPng } from '../composer/rasterize_page';
import { formatMemoryReport } from '../services/memory_sampler';
import { LoopbackHttpClient } from '../services/loopback_http_client';
import { renderDashboardReport } from './render_dashboard_report';
import type { ServerRenderJobParams, ServerRenderTaskPayload } from './job_params';

export const SERVER_RENDER_PNG_JOB_TYPE = 'pngServer';

/**
 * Prototype export type for the experimental Chromium-free render path (behind
 * `xpack.reporting.experimental.serverRender`). Unlike `PngExportType`
 * (`@kbn/reporting-export-types-png`), `runTask` never drives a real browser via
 * `screenshotting`: `renderDashboardReport` navigates a headless jsdom worker to the same
 * `locatorParams`-resolved redirect URL the Chromium pipeline uses, then composes the
 * result with `@elastic/isomer-image-takumi` -- see `render_dashboard_report.ts` for what
 * this does and does not cover yet in this prototype pass.
 */
export class ServerRenderPngExportType extends ExportType<
  ServerRenderJobParams,
  ServerRenderTaskPayload
> {
  id = SERVER_RENDER_PNG_JOB_TYPE;
  name = 'PNG (server render prototype)';
  jobType = SERVER_RENDER_PNG_JOB_TYPE;
  jobContentEncoding = 'base64' as const;
  jobContentExtension = 'png' as const;
  validLicenses: LicenseType[] = [
    LICENSE_TYPE_TRIAL,
    LICENSE_TYPE_CLOUD_STANDARD,
    LICENSE_TYPE_GOLD,
    LICENSE_TYPE_PLATINUM,
    LICENSE_TYPE_ENTERPRISE,
  ];

  constructor(...args: ConstructorParameters<typeof ExportType>) {
    super(...args);
    this.logger = this.logger.get('server-render-png');
  }

  public createJob = async (jobParams: ServerRenderJobParams) => ({
    ...jobParams,
    forceNow: new Date().toISOString(),
  });

  public runTask = async ({
    payload,
    request,
    stream,
  }: RunTaskOpts<ServerRenderTaskPayload>): Promise<TaskRunResult> => {
    const serverInfo = this.getServerInfo();
    const client = new LoopbackHttpClient({
      baseUrl: `${serverInfo.protocol}://${serverInfo.hostname}:${serverInfo.port}`,
      basePath: serverInfo.basePath,
      forwardedHeaders: request.headers,
    });
    const page = await renderDashboardReport({
      client,
      locatorParams: payload.locatorParams[0],
      spaceId: payload.spaceId,
      pageWidthPx: payload.layout?.dimensions?.width ?? 1200,
    });
    if (page.memory) {
      this.logger.info(`Server render ${formatMemoryReport(page.memory)}`);
    }
    const buffer = await rasterizePageToPng(page);
    stream.write(buffer);
    return { content_type: 'image/png', metrics: {}, warnings: page.warnings };
  };
}
