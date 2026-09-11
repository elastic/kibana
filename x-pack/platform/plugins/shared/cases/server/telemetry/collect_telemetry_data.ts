/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAlertsTelemetryData } from './queries/alerts';
import { getCasesTelemetryData } from './queries/cases';
import { getCasesSystemActionData } from './queries/case_system_action';
import { getUserCommentsTelemetryData } from './queries/comments';
import { getConfigurationTelemetryData } from './queries/configuration';
import { getConnectorsTelemetryData } from './queries/connectors';
import { getPushedTelemetryData } from './queries/push';
import { getUserActionsTelemetryData } from './queries/user_actions';
import { getTemplatesTelemetryData } from './queries/templates';
import { getFieldLibraryTelemetryData } from './queries/field_definitions';
import type { CasesTelemetry, CollectTelemetryDataParams } from './types';

export const collectTelemetryData = async ({
  savedObjectsClient,
  logger,
}: CollectTelemetryDataParams): Promise<Partial<CasesTelemetry>> => {
  try {
    const [
      cases,
      userActions,
      comments,
      alerts,
      connectors,
      pushes,
      configuration,
      casesSystemAction,
      templates,
      fieldLibrary,
    ] = await Promise.all([
      getCasesTelemetryData({ savedObjectsClient, logger }),
      getUserActionsTelemetryData({ savedObjectsClient, logger }),
      getUserCommentsTelemetryData({ savedObjectsClient, logger }),
      getAlertsTelemetryData({ savedObjectsClient, logger }),
      getConnectorsTelemetryData({ savedObjectsClient, logger }),
      getPushedTelemetryData({ savedObjectsClient, logger }),
      getConfigurationTelemetryData({ savedObjectsClient, logger }),
      getCasesSystemActionData({ savedObjectsClient, logger }),
      getTemplatesTelemetryData({ savedObjectsClient, logger }).catch((err) => {
        logger.debug('Failed collecting Cases templates telemetry data');
        logger.debug(err);
        return undefined;
      }),
      getFieldLibraryTelemetryData({ savedObjectsClient, logger }).catch((err) => {
        logger.debug('Failed collecting Cases field library telemetry data');
        logger.debug(err);

        return undefined;
      }),
    ]);

    return {
      cases,
      userActions,
      comments,
      alerts,
      connectors,
      pushes,
      configuration,
      casesSystemAction,
      ...(templates !== undefined ? { templates } : {}),
      ...(fieldLibrary !== undefined ? { fieldLibrary } : {}),
    };
  } catch (err) {
    logger.debug('Failed collecting Cases telemetry data');
    logger.debug(err);
    /**
     * Return an empty object instead of an empty state to distinguish between
     * clusters that they do not use cases thus all counts will be zero
     * and clusters where an error occurred.
     *
     * The isolation above is one-directional: a templates or field library failure costs
     * only its own numbers, but a failure in any area collected here still discards the
     * whole payload.
     */

    return {};
  }
};
