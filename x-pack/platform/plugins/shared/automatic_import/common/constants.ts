/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LicenseType } from '@kbn/licensing-plugin/common/types';

// Plugin information
export const PLUGIN_ID = 'automaticImport';

// Public App Routes
export const AUTOMATIC_IMPORT_APP_ROUTE = '/app/automatic_import';

// Server API Routes
export const AUTOMATIC_IMPORT_BASE_PATH = '/internal/automatic_import';

export const ECS_GRAPH_PATH = `${AUTOMATIC_IMPORT_BASE_PATH}/ecs`;
export const CATEGORIZATION_GRAPH_PATH = `${AUTOMATIC_IMPORT_BASE_PATH}/categorization`;
export const ANALYZE_LOGS_PATH = `${AUTOMATIC_IMPORT_BASE_PATH}/analyzelogs`;
export const RELATED_GRAPH_PATH = `${AUTOMATIC_IMPORT_BASE_PATH}/related`;
export const ANALYZE_API_PATH = `${AUTOMATIC_IMPORT_BASE_PATH}/analyzeapi`;
export const CEL_INPUT_GRAPH_PATH = `${AUTOMATIC_IMPORT_BASE_PATH}/cel`;
export const CHECK_PIPELINE_PATH = `${AUTOMATIC_IMPORT_BASE_PATH}/pipeline`;
export const INTEGRATION_BUILDER_PATH = `${AUTOMATIC_IMPORT_BASE_PATH}/build`;
export const FLEET_PACKAGES_PATH = `/api/fleet/epm/packages`;

// License
export const MINIMUM_LICENSE_TYPE: LicenseType = 'enterprise';

// ErrorCodes

export enum GenerationErrorCode {
  RECURSION_LIMIT = 'recursion-limit',
  RECURSION_LIMIT_ANALYZE_LOGS = 'recursion-limit-analyze-logs',
  UNSUPPORTED_LOG_SAMPLES_FORMAT = 'unsupported-log-samples-format',
  UNPARSEABLE_CSV_DATA = 'unparseable-csv-data',
  CEF_ERROR = 'cef-not-supported',
}

// Size limits
export const FRONTEND_SAMPLE_ROWS = 100;
export const LOG_FORMAT_DETECTION_SAMPLE_ROWS = 5;
export const CATEGORIZATION_INITIAL_BATCH_SIZE = 60;
export const CATEROGIZATION_REVIEW_BATCH_SIZE = 40;
export const CATEGORIZATION_REVIEW_MAX_CYCLES = 5;
export const CATEGORIZATION_RECURSION_LIMIT = 50;

// Name regex pattern
export const NAME_REGEX_PATTERN = /^[a-z_][a-z0-9_]+$/;

// Datastream name regex pattern. Same regex that for the name validation in elastic-package
export const DATASTREAM_NAME_REGEX_PATTERN = /^([a-z0-9]{2}|[a-z0-9][a-z0-9_]+[a-z0-9])$/;
