/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { Server } from 'hapi';
import Boom from 'boom';
import { Setup } from '../../helpers/setup_request';
import { getApmIndices } from '../../helpers/apm_ui_indices';

export async function getUiIndex({
  setup,
  server,
  indexConfigurationName
}: {
  setup: Setup;
  server: Server;
  indexConfigurationName: string;
}) {
  const apmIndices = await getApmIndices(server);
  const indexConfigurationValue: string | undefined = get(
    apmIndices,
    indexConfigurationName
  );
  if (!indexConfigurationValue) {
    throw Boom.notFound(
      `Unknown index configuration specified: ${indexConfigurationName}`
    );
  }
  return indexConfigurationValue;
}
