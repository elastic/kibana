/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import rison from '@kbn/rison';
import {
  getPdfReportParams,
  getPngReportParams,
} from '@kbn/reporting-public/share/share_context_menu/register_pdf_png_modal_reporting';
import { getCsvReportParams } from '@kbn/reporting-public/share/share_context_menu/register_csv_modal_reporting';
import type { ReportingAPIClient } from '@kbn/reporting-public';
import type { ReportTypeId } from '../types';

const reportParamsProviders = {
  pngV2: getPngReportParams,
  printablePdfV2: getPdfReportParams,
  csv_searchsource: getCsvReportParams,
  csv_v2: getCsvReportParams,
} as const;

export const supportedReportTypes = Object.keys(reportParamsProviders) as ReportTypeId[];

export interface GetReportParamsOptions {
  apiClient: ReportingAPIClient;
  reportTypeId: ReportTypeId;
  objectType: string;
  sharingData: any;
  title: string;
}

export const getReportParams = ({
  apiClient,
  reportTypeId,
  objectType,
  sharingData,
  title,
}: GetReportParamsOptions) => {
  const getParams = reportParamsProviders[reportTypeId];
  if (!getParams) {
    throw new Error(`No params provider found for report type ${reportTypeId}`);
  }
  return rison.encode(
    apiClient.getDecoratedJobParams({
      ...getParams({
        objectType,
        sharingData,
      }),
      objectType,
      title,
    })
  );
};
