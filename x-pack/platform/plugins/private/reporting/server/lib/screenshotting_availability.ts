/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core/server';
import { PDF_REPORT_TYPE, PDF_REPORT_TYPE_V2 } from '@kbn/reporting-export-types-pdf-common';
import { PNG_REPORT_TYPE_V2 } from '@kbn/reporting-export-types-png-common';
import type { ScreenshottingStart } from '@kbn/screenshotting-plugin/server';
import type { ReportingStartDeps } from '../types';

const SCREENSHOT_EXPORT_TYPE_IDS = new Set([
  PDF_REPORT_TYPE,
  PDF_REPORT_TYPE_V2,
  PNG_REPORT_TYPE_V2,
]);

/** Whether the export type renders through a screenshotting implementation (PDF and PNG). */
export const isScreenshotExportType = (exportTypeId: string): boolean =>
  SCREENSHOT_EXPORT_TYPE_IDS.has(exportTypeId);

/** The screenshotting implementation PDF and PNG reports render with, if any is enabled. */
export const getScreenshotting = ({
  pageRenderScreenshotting,
  screenshotting,
}: Pick<ReportingStartDeps, 'pageRenderScreenshotting' | 'screenshotting'>):
  | ScreenshottingStart
  | undefined => pageRenderScreenshotting ?? screenshotting;

/** Hides PDF and PNG reports in the UI when no screenshotting implementation is enabled. */
export const registerScreenshottingCapabilitiesSwitcher = (
  core: Pick<CoreSetup<ReportingStartDeps>, 'capabilities' | 'getStartServices'>
) => {
  core.capabilities.registerSwitcher(
    async () => {
      const [, plugins] = await core.getStartServices();
      if (getScreenshotting(plugins)) {
        return {};
      }

      return {
        dashboard_v2: { generateScreenshot: false },
        visualize_v2: { generateScreenshot: false },
      };
    },
    { capabilityPath: ['dashboard_v2.*', 'visualize_v2.*'] }
  );
};
