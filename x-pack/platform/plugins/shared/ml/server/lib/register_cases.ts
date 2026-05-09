/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { CasesServerSetup } from '@kbn/cases-plugin/server';
import {
  ML_ANOMALY_CHARTS_ATTACHMENT_TYPE,
  ML_ANOMALY_SWIMLANE_ATTACHMENT_TYPE,
  ML_SINGLE_METRIC_VIEWER_ATTACHMENT_TYPE,
} from '@kbn/cases-plugin/common';
import type { MlFeatures } from '../../common/constants/app';
import { casesSchemaValidator } from '../../common/util/cases_utils';

export function registerCasesPersistableState(
  cases: CasesServerSetup,
  enabledFeatures: MlFeatures,
  logger: Logger
) {
  if (enabledFeatures.ad === true) {
    try {
      cases.attachmentFramework.registerUnified({
        id: ML_ANOMALY_SWIMLANE_ATTACHMENT_TYPE,
        schemaValidator: casesSchemaValidator,
      });
    } catch (error) {
      logger.warn(
        `ML failed to register cases persistable state for ${ML_ANOMALY_SWIMLANE_ATTACHMENT_TYPE}`
      );
    }
    try {
      cases.attachmentFramework.registerUnified({
        id: ML_ANOMALY_CHARTS_ATTACHMENT_TYPE,
        schemaValidator: casesSchemaValidator,
      });
    } catch (error) {
      logger.warn(
        `ML failed to register cases persistable state for ${ML_ANOMALY_CHARTS_ATTACHMENT_TYPE}`
      );
    }

    try {
      cases.attachmentFramework.registerUnified({
        id: ML_SINGLE_METRIC_VIEWER_ATTACHMENT_TYPE,
        schemaValidator: casesSchemaValidator,
      });
    } catch (error) {
      logger.warn(
        `ML failed to register cases persistable state for ${ML_SINGLE_METRIC_VIEWER_ATTACHMENT_TYPE}`
      );
    }
  }
}
