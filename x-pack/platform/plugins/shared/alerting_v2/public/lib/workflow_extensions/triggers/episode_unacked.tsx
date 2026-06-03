/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { PublicTriggerDefinition } from '@kbn/workflows-extensions/public';
import { episodeUnackedTriggerCommonDefinition } from '../../../../common/workflows/triggers';

const EpisodeUnackedIcon = React.lazy(() =>
  import('@elastic/eui/es/components/icon/assets/cross').then(({ icon }) => ({
    default: icon,
  }))
);

export const episodeUnackedTriggerPublicDefinition: PublicTriggerDefinition = {
  ...episodeUnackedTriggerCommonDefinition,
  icon: EpisodeUnackedIcon,
};
