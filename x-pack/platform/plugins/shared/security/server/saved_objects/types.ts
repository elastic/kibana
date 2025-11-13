/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The SecurityAction enumeration contains values for all valid shared object
 * security actions. The string for each value correlates to the ES operation.
 */
export enum SecurityAction {
  CHECK_CONFLICTS,
  CLOSE_POINT_IN_TIME,
  COLLECT_MULTINAMESPACE_REFERENCES,
  COLLECT_MULTINAMESPACE_REFERENCES_UPDATE_SPACES,
  CREATE,
  BULK_CREATE,
  DELETE,
  BULK_DELETE,
  FIND,
  GET,
  BULK_GET,
  INTERNAL_BULK_RESOLVE,
  OPEN_POINT_IN_TIME,
  REMOVE_REFERENCES,
  UPDATE,
  BULK_UPDATE,
  UPDATE_OBJECTS_SPACES,
  CHANGE_OWNERSHIP,
  CHANGE_ACCESS_MODE,
}
