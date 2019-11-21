/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  InfraWaffleMapGradientLegend,
  InfraWaffleMapLegendMode,
  InfraWaffleMapStepLegend,
} from '../../../lib/lib';
export function isInfraWaffleMapStepLegend(subject: any): subject is InfraWaffleMapStepLegend {
  return subject.type && subject.type === InfraWaffleMapLegendMode.step;
}
export function isInfraWaffleMapGradientLegend(
  subject: any
): subject is InfraWaffleMapGradientLegend {
  return subject.type && subject.type === InfraWaffleMapLegendMode.gradient;
}
