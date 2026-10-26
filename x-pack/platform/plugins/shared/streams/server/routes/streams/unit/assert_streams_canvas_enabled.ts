/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { notFound } from '@hapi/boom';
import { OBSERVABILITY_STREAMS_ENABLE_CANVAS } from '@kbn/management-settings-ids';

export const assertStreamsCanvasEnabled = async (uiSettingsClient: {
  get: (key: string) => Promise<unknown>;
}) => {
  const canvasEnabled = await uiSettingsClient.get(OBSERVABILITY_STREAMS_ENABLE_CANVAS);

  if (!canvasEnabled) {
    throw notFound('Streams unit API is not enabled.');
  }
};
