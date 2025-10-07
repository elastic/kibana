/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function getCoordinates(latLonString: string): number[] {
  return latLonString
    .split(',')
    .map((coordinate: string) => Number(coordinate))
    .reverse();
}
