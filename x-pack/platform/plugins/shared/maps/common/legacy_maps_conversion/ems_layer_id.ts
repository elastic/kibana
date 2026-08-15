/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import isPlainObject from 'lodash/isPlainObject';

export function getEmsLayerIdFromSelectedLayer(selectedLayer: unknown): string | undefined {
  if (!isPlainObject(selectedLayer)) return undefined;

  const id = (selectedLayer as any).id;
  if (typeof id === 'string') return id;

  const layerId = (selectedLayer as any).layerId;
  if (typeof layerId === 'string') {
    // Region maps from 6.x will have numerical EMS id refering to S3 bucket id.
    // In this case, use layerId which contains the EMS layer name.
    const split = layerId.split('.');
    return split.length === 2 ? split[1] : undefined;
  }

  return undefined;
}
