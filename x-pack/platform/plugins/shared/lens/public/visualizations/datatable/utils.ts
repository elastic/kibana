/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ColorMapping, ColorStop, PaletteOutput } from '@kbn/coloring';

export function getColumnAlignment<C extends { alignment?: 'left' | 'right' | 'center' }>(
  { alignment }: C,
  isNumeric = false
): 'left' | 'right' | 'center' {
  if (alignment) return alignment;
  return isNumeric ? 'right' : 'left';
}

export function detectColorConfigMismatch({
  colorByTerms,
  palette,
  colorMapping,
}: {
  colorByTerms: boolean;
  palette?: PaletteOutput<{ stops?: ColorStop[] | number[] }>;
  colorMapping?: ColorMapping.Config | string;
}) {
  const isValueBasedPalette = Boolean(palette?.params?.stops?.length);

  return {
    hasColorMappingOnNumeric: !colorByTerms && colorMapping != null,
    hasValuePaletteOnBucket: colorByTerms && isValueBasedPalette,
  };
}
