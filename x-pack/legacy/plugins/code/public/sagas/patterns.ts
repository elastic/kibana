/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Action } from 'redux-actions';

import { Match, routeChange } from '../actions';
import { PathTypes } from '../common/types';
import * as ROUTES from '../components/routes';

export const generatePattern = (path: string) => (action: Action<Match>) =>
  action.type === String(routeChange) && action.payload!.path === path;
export const rootRoutePattern = generatePattern(ROUTES.ROOT);
export const setupRoutePattern = generatePattern(ROUTES.SETUP);
export const adminRoutePattern = generatePattern(ROUTES.ADMIN);
export const repoRoutePattern = generatePattern(ROUTES.REPO);
export const mainRoutePattern = (action: Action<Match>) =>
  action.type === String(routeChange) &&
  (ROUTES.MAIN === action.payload!.path || ROUTES.MAIN_ROOT === action.payload!.path);
export const searchRoutePattern = generatePattern(ROUTES.SEARCH);
export const commitRoutePattern = generatePattern(ROUTES.DIFF);

export const sourceFilePattern = (action: Action<Match>) =>
  mainRoutePattern(action) && action.payload!.params.pathType === PathTypes.blob;

export const blamePattern = (action: Action<Match>) =>
  mainRoutePattern(action) && action.payload!.params.pathType === PathTypes.blame;
