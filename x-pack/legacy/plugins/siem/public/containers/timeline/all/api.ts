/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaServices } from '../../../lib/kibana';
import { ExportSelectedData } from '../../../components/generic_downloader';
import { TIMELINE_EXPORT_URL } from '../../../../common/constants';

export const exportSelectedTimeline: ExportSelectedData = async ({
  excludeExportDetails = false,
  filename = `timelines_export.ndjson`,
  ids = [],
  signal,
}): Promise<Blob> => {
  const body = ids.length > 0 ? JSON.stringify({ objects: ids }) : undefined;
  const response = await KibanaServices.get().http.fetch<Blob>(`${TIMELINE_EXPORT_URL}`, {
    method: 'POST',
    body,
    query: {
      exclude_export_details: excludeExportDetails,
      file_name: filename,
    },
    signal,
    asResponse: true,
  });

  return response.body!;
};
