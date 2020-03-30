/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AnyAction } from 'redux';
import { MapCenter } from '../actions/map_actions';

export function getHiddenLayerIds(state: unknown): string[];

export function getMapZoom(state: unknown): number;

export function getMapCenter(state: unknown): MapCenter;

export function getQueryableUniqueIndexPatternIds(state: unknown): string[];
