/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { getInternalSavedObjectsClient } from '../helpers/saved_objects_client';
import apmIndexPattern from '../../../../../../../src/legacy/core_plugins/kibana/server/tutorials/apm/index_pattern.json';
import { APM_STATIC_INDEX_PATTERN_ID } from '../../../common/index_pattern_constants';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { SavedObjectsErrorHelpers } from '../../../../../../../src/core/server/saved_objects';
import { hasHistoricalAgentData } from '../services/get_services/has_historical_agent_data';
import { Setup } from '../helpers/setup_request';
import { APMRequestHandlerContext } from '../../routes/typings';

export async function createStaticIndexPattern(
  setup: Setup,
  context: APMRequestHandlerContext
): Promise<void> {
  const { config } = context;

  // don't autocreate APM index pattern if it's been disabled via the config
  if (!config['xpack.apm.autocreateApmIndexPattern']) {
    return;
  }

  // Discover and other apps will throw errors if an index pattern exists without having matching indices.
  // The following ensures the index pattern is only created if APM data is found
  const hasData = await hasHistoricalAgentData(setup);
  if (!hasData) {
    return;
  }

  try {
    const apmIndexPatternTitle = config['apm_oss.indexPattern'];
    const internalSavedObjectsClient = getInternalSavedObjectsClient(
      context.__LEGACY.server
    );
    await internalSavedObjectsClient.create(
      'index-pattern',
      {
        ...apmIndexPattern.attributes,
        title: apmIndexPatternTitle
      },
      { id: APM_STATIC_INDEX_PATTERN_ID, overwrite: false }
    );
    return;
  } catch (e) {
    // if the index pattern (saved object) already exists a conflict error (code: 409) will be thrown
    // that error should be silenced
    if (SavedObjectsErrorHelpers.isConflictError(e)) {
      return;
    }
    throw e;
  }
}
