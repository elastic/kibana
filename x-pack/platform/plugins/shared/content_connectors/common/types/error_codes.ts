/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum ErrorCode {
  ACCESS_CONTROL_DISABLED = 'access_control_disabled',
  ANALYTICS_COLLECTION_ALREADY_EXISTS = 'analytics_collection_already_exists',
  ANALYTICS_COLLECTION_NOT_FOUND = 'analytics_collection_not_found',
  CONNECTOR_DOCUMENT_ALREADY_EXISTS = 'connector_document_already_exists',
  CONNECTOR_UNSUPPORTED_OPERATION = 'connector_unsupported_operation',
  CRAWLER_ALREADY_EXISTS = 'crawler_already_exists',
  DOCUMENT_NOT_FOUND = 'document_not_found',
  EXPENSIVE_QUERY_NOT_ALLOWED_ERROR = 'expensive_queries_not_allowed',
  INDEX_ALREADY_EXISTS = 'index_already_exists',
  INDEX_NOT_FOUND = 'index_not_found',
  MAPPING_UPDATE_FAILED = 'mapping_update_failed',
  PARAMETER_CONFLICT = 'parameter_conflict',
  PIPELINE_ALREADY_EXISTS = 'pipeline_already_exists',
  PIPELINE_IS_IN_USE = 'pipeline_is_in_use',
  PIPELINE_NOT_FOUND = 'pipeline_not_found',
  RESOURCE_NOT_FOUND = 'resource_not_found',
  SEARCH_APPLICATION_ALIAS_NOT_FOUND = 'search_application_alias_not_found',
  SEARCH_APPLICATION_ALREADY_EXISTS = 'search_application_already_exists',
  SEARCH_APPLICATION_NAME_INVALID = 'search_application_name_invalid',
  SEARCH_APPLICATION_NOT_FOUND = 'search_application_not_found',
  STATUS_TRANSITION_ERROR = 'status_transition_error',
  UNAUTHORIZED = 'unauthorized',
  UNCAUGHT_EXCEPTION = 'uncaught_exception',
  GENERATE_INDEX_NAME_ERROR = 'generate_index_name_error',
}
