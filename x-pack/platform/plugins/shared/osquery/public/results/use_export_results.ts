/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { Filter } from '@kbn/es-query';

import { useKibana } from '../common/lib/kibana';
import { API_VERSIONS } from '../../common/constants';

export type ExportFormat = 'ndjson' | 'json' | 'csv';

export interface ExportFiltersParam {
  kuery?: string;
  esFilters?: Filter[];
}

interface UseExportResultsOptions {
  actionId: string;
  isLive: boolean;
  liveQueryId?: string;
  scheduleId?: string;
  executionCount?: number;
}

export const useExportResults = ({
  actionId,
  isLive,
  liveQueryId,
  scheduleId,
  executionCount,
}: UseExportResultsOptions) => {
  const { http, notifications } = useKibana().services;
  const [isExporting, setIsExporting] = useState(false);

  const exportResults = useCallback(
    async (format: ExportFormat, filters?: ExportFiltersParam) => {
      setIsExporting(true);
      let loadingToastId: string | undefined;

      try {
        const path =
          isLive || !scheduleId || executionCount == null
            ? `/api/osquery/live_queries/${liveQueryId ?? actionId}/results/${actionId}/_export`
            : `/api/osquery/scheduled_results/${scheduleId}/${executionCount}/_export`;

        loadingToastId = notifications.toasts.addInfo({
          title: i18n.translate('xpack.osquery.exportResults.loadingToast', {
            defaultMessage: 'Exporting results as {format}…',
            values: { format: format.toUpperCase() },
          }),
          text: i18n.translate('xpack.osquery.exportResults.loadingToastText', {
            defaultMessage: 'This may take a moment for large result sets.',
          }),
        }).id;

        const kuery = filters?.kuery;
        const esFilters = filters?.esFilters?.length ? filters.esFilters : undefined;
        const body =
          kuery || esFilters
            ? {
                ...(kuery && { kuery }),
                ...(esFilters && { esFilters }),
              }
            : undefined;

        const response = await http.fetch(path, {
          method: 'POST',
          version: API_VERSIONS.public.v1,
          query: { format },
          body: body ? JSON.stringify(body) : undefined,
          asResponse: true,
          rawResponse: true,
        });

        const rawResp = response.response as Response;

        const contentDisposition = rawResp.headers?.get('content-disposition') ?? '';
        const fileNameMatch = contentDisposition.match(/filename="(.+)"/);
        const fileName = fileNameMatch?.[1] ?? `osquery-results-${actionId}.${format}`;

        // True streaming-to-disk (File System Access API) is intentionally not
        // used here because user activation from the button click expires
        // before the server response arrives, and the picker call then
        // throws SecurityError. `arrayBuffer()` is the fallback path for
        // environments without a streamable `body`.
        const blob = rawResp.body
          ? await rawResp.blob()
          : new Blob([await rawResp.arrayBuffer()], {
              type: rawResp.headers.get('content-type') ?? 'application/octet-stream',
            });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = fileName;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        // Defer revocation: in some browsers (notably Safari and older
        // Chromium) `anchor.click()` schedules the actual download
        // asynchronously, so revoking the URL on the next synchronous line
        // can race with the browser fetching the blob and produce a broken
        // download. A `setTimeout(_, 0)` lets the browser pick up the URL
        // before we drop it.
        setTimeout(() => URL.revokeObjectURL(url), 0);

        notifications.toasts.addSuccess(
          i18n.translate('xpack.osquery.exportResults.successToast', {
            defaultMessage: 'Results exported successfully',
          })
        );
      } catch (error) {
        const errorMessage =
          error?.body?.message ??
          i18n.translate('xpack.osquery.exportResults.errorToast', {
            defaultMessage: 'Failed to export results',
          });

        if (error?.body?.statusCode === 403) {
          notifications.toasts.addDanger(
            i18n.translate('xpack.osquery.exportResults.unauthorizedToast', {
              defaultMessage: 'You do not have permission to export results',
            })
          );
        } else {
          notifications.toasts.addDanger(errorMessage);
        }
      } finally {
        if (loadingToastId) {
          notifications.toasts.remove(loadingToastId);
        }

        setIsExporting(false);
      }
    },
    [http, notifications, actionId, isLive, liveQueryId, scheduleId, executionCount]
  );

  return { exportResults, isExporting };
};
