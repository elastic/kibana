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
import { getEmptyTemplatesTelemetry, getTemplatesTelemetryData } from './queries/templates';
import { getFieldLibraryTelemetryData } from './queries/field_definitions';
import { getWorkflowsTelemetryData } from './queries/workflows';
import type {
  CasesTelemetry,
  CollectCasesTelemetryParams,
  CollectTelemetryDataParams,
  TemplatesTelemetry,
} from './types';

/**
 * The templates area, reporting the flag state alongside the counts.
 *
 * When the flag is off the reads are skipped rather than left to come back empty. With the
 * flag off, `getSavedObjectsTypes` leaves the templates type out of the telemetry
 * repository, so the two template reads would return nothing — but the case-adoption read
 * is over the cases type, which is always included, and would report real counts inside a
 * payload that claims the feature is off.
 *
 * Throws on a read failure. The caller owns the error boundary.
 */
const collectTemplatesTelemetry = async ({
  savedObjectsClient,
  logger,
  templatesEnabled,
}: CollectCasesTelemetryParams): Promise<TemplatesTelemetry> => {
  if (!templatesEnabled) {
    return { featureEnabled: false, ...getEmptyTemplatesTelemetry() };
  }

  return {
    featureEnabled: true,
    ...(await getTemplatesTelemetryData({ savedObjectsClient, logger })),
  };
};

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
      workflows,
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
      getWorkflowsTelemetryData({ savedObjectsClient, logger }),
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
      workflows,
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
