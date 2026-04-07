/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';
import { i18n } from '@kbn/i18n';

import { useKibana } from '../common/lib/kibana';
import { API_VERSIONS } from '../../common/constants';

export type ExportFormat = 'ndjson' | 'json' | 'csv';

interface UseExportResultsOptions {
  actionId: string;
  isLive: boolean;
  scheduleId?: string;
  executionCount?: number;
}

export const useExportResults = ({
  actionId,
  isLive,
  scheduleId,
  executionCount,
}: UseExportResultsOptions) => {
  const { http, notifications } = useKibana().services;
  const [isExporting, setIsExporting] = useState(false);

  const exportResults = useCallback(
    async (format: ExportFormat) => {
      setIsExporting(true);
      let loadingToastId: string | undefined;

      try {
        const path =
          isLive || !scheduleId || executionCount == null
            ? `/api/osquery/results/${actionId}/_export`
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

        const response = await http.fetch(path, {
          method: 'POST',
          version: API_VERSIONS.public.v1,
          query: { format },
          asResponse: true,
          rawResponse: true,
        });

        const rawResp = response.response as Response;
        const blob = await rawResp.blob();

        // Extract filename from Content-Disposition or generate one
        const contentDisposition = rawResp.headers?.get('content-disposition') ?? '';
        const fileNameMatch = contentDisposition.match(/filename="(.+)"/);
        const fileName =
          fileNameMatch?.[1] ?? `osquery-results-${actionId}.${format === 'csv' ? 'csv' : format}`;

        // Trigger browser download
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = fileName;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        URL.revokeObjectURL(url);

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
    [http, notifications, actionId, isLive, scheduleId, executionCount]
  );

  return { exportResults, isExporting };
};
