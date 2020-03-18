/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ImportRulesProps, ImportRulesResponse } from '../../detection_engine/rules';
import { KibanaServices } from '../../../lib/kibana';
import { IMPORT_TIMELINES_URL } from '../../../../common/constants';

export const importTimelines = async ({
  fileToImport,
  overwrite = false,
  signal,
}: ImportRulesProps): Promise<ImportRulesResponse> => {
  const formData = new FormData();
  formData.append('file', fileToImport);

  return KibanaServices.get().http.fetch<ImportRulesResponse>(`${IMPORT_TIMELINES_URL}`, {
    method: 'POST',
    headers: { 'Content-Type': undefined },
    query: { overwrite },
    body: formData,
    signal,
  });
};
