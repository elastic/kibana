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
import {
  getEmptyFieldLibraryTelemetry,
  getFieldLibraryTelemetryData,
} from './queries/field_definitions';
import type {
  CasesTelemetry,
  CollectCasesTelemetryParams,
  FieldLibraryTelemetry,
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

/**
 * Skipped when the flag is off by choice, not by constraint. Unlike templates, the
 * field-definition type stays in the telemetry repository either way — see the `templates` flag
 * in `server/config.ts` — so this would otherwise report the definitions a deployment kept after
 * disabling the feature. Reporting the flag keeps that decision visible.
 *
 * Throws on a read failure; the caller owns the error boundary.
 */
const collectFieldLibraryTelemetry = async ({
  savedObjectsClient,
  logger,
  templatesEnabled,
}: CollectCasesTelemetryParams): Promise<FieldLibraryTelemetry> => {
  if (!templatesEnabled) {
    return { featureEnabled: false, ...getEmptyFieldLibraryTelemetry() };
  }

  return {
    featureEnabled: true,
    ...(await getFieldLibraryTelemetryData({ savedObjectsClient, logger })),
  };
};

export const collectTelemetryData = async ({
  savedObjectsClient,
  logger,
  templatesEnabled,
}: CollectCasesTelemetryParams): Promise<Partial<CasesTelemetry>> => {
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
      collectTemplatesTelemetry({ savedObjectsClient, logger, templatesEnabled }).catch((err) => {
        logger.debug('Failed collecting Cases templates telemetry data');
        logger.debug(err);
        return undefined;
      }),
      collectFieldLibraryTelemetry({ savedObjectsClient, logger, templatesEnabled }).catch(
        (err) => {
          logger.debug('Failed collecting Cases field library telemetry data');
          logger.debug(err);

          return undefined;
        }
      ),
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
