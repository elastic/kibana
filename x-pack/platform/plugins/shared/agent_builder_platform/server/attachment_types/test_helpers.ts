/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatValidationError } from '@elastic/isomer-sdk';
import type { SurfaceComposition } from '@kbn/agent-builder-server/attachments';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { isomerPluginMock } from '@kbn/isomer-plugin/server/mocks';

/** The space-aware Kibana URL Slack renders resolve Kibana app links against, in these tests. */
export const SURFACE_BASE_URL = 'https://kibana.example.com/base/s/ops';

export const surfaceContext = {
  request: httpServerMock.createKibanaRequest(),
  spaceId: 'ops',
};

/**
 * Validates a surface composition with the `isomer` plugin's runtime, as Agent Builder does before
 * it renders one, and renders it for Slack, as Agent Builder does, and as text.
 */
export const renderSurface = async (composition: SurfaceComposition | undefined) => {
  if (!composition) {
    throw new Error('Expected a surface composition');
  }

  const runtime = await isomerPluginMock.createStartContract().getRuntime();
  const { valid, errors } = runtime.validate(composition);

  return {
    errors: errors.map(formatValidationError),
    valid,
    slack: JSON.stringify(
      runtime.surfaces.slack.render(composition, { heading: false, baseUrl: SURFACE_BASE_URL })
        .blocks
    ),
    text: runtime.surfaces.text.render(composition),
  };
};
