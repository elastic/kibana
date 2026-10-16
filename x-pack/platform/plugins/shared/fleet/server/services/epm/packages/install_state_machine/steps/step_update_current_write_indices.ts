/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { updateCurrentWriteIndices } from '../../../elasticsearch/template/template';

import { withPackageSpan } from '../../utils';

import type { InstallContext } from '../_state_machine_package_install';

export async function stepUpdateCurrentWriteIndices(context: InstallContext) {
  const { esClient, logger, ignoreMappingUpdateErrors, skipDataStreamRollover, indexTemplates } =
    context;

  // update current backing indices of each data stream
  await withPackageSpan('Update write indices', () =>
    updateCurrentWriteIndices(esClient, logger, indexTemplates || [], {
      ignoreMappingUpdateErrors,
      skipDataStreamRollover,
      // The install may have removed `logsdb_columnar` from a data stream's index template,
      // because the data stream is no longer columnar-ready. The write index keeps the mode
      // until it is rolled over, so ask for the rollover explicitly.
      rolloverOnIndexModeReset: true,
    })
  );
}
