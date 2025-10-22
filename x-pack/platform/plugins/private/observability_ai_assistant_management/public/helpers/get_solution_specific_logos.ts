/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SolutionView } from '@kbn/spaces-plugin/common';

/**
 * Return the logo(s) that should be displayed for the given solution.
 *
 * - `oblt`  => Observability logo
 * - `es`    => Enterprise Search logo
 * - default => Both logos (Observability + Enterprise Search)
 */
export function getSolutionSpecificLogos(solution?: SolutionView): string[] {
  switch (solution) {
    case 'oblt':
      return ['logoObservability'];
    case 'es':
      return ['logoEnterpriseSearch'];
    default:
      return ['logoObservability', 'logoEnterpriseSearch'];
  }
}
