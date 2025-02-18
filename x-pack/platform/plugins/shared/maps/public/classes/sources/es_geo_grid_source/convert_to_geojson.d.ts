/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Feature } from 'geojson';
import { RENDER_AS } from '../../../../common/constants';

export function convertCompositeRespToGeoJson(esResponse: any, renderAs: RENDER_AS): Feature[];
export function convertRegularRespToGeoJson(esResponse: any, renderAs: RENDER_AS): Feature[];
