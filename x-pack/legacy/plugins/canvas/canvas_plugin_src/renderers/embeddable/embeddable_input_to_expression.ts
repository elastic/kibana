/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EmbeddableTypes, EmbeddableInput } from '../../expression_types';
import { SavedMapInput } from '../../functions/common/saved_map';

/*
  Take the input from an embeddable and the type of embeddable and convert it into an expression
*/
export function embeddableInputToExpression(
  input: EmbeddableInput,
  embeddableType: string
): string {
  const expressionParts: string[] = [];

  if (embeddableType === EmbeddableTypes.map) {
    const mapInput = input as SavedMapInput;

    expressionParts.push('savedMap');

    expressionParts.push(`id="${input.id}"`);

    if (input.title) {
      expressionParts.push(`title="${input.title}"`);
    }

    if (mapInput.mapCenter) {
      expressionParts.push(
        `center={mapCenter lat=${mapInput.mapCenter.lat} lon=${mapInput.mapCenter.lon} zoom=${mapInput.mapCenter.zoom}}`
      );
    }

    if (mapInput.timeRange) {
      expressionParts.push(
        `timerange={timerange from="${mapInput.timeRange.from}" to="${mapInput.timeRange.to}"}`
      );
    }
  }
  return expressionParts.join(' ');
}
