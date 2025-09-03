/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { isReservedSpace } from './is_reserved_space';
export {
  MAX_SPACE_INITIALS,
  SPACE_SEARCH_COUNT_THRESHOLD,
  ENTER_SPACE_PATH,
  DEFAULT_SPACE_ID,
  API_VERSIONS,
} from './constants';
export { getRouteUrlForSpace } from './get_spaced_route_url';
export { addSpaceIdToPath, getSpaceIdFromPath } from '@kbn/spaces-utils';
export type {
  Space,
  GetAllSpacesOptions,
  GetAllSpacesPurpose,
  GetSpaceResult,
  SolutionView,
} from './types/latest';
export type { spaceV1 } from './types';
