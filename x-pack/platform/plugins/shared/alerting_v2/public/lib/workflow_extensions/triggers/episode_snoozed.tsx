/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { PublicTriggerDefinition } from '@kbn/workflows-extensions/public';
import { episodeSnoozedTriggerCommonDefinition } from '../../../../common/workflows/triggers';

const EpisodeSnoozedIcon = React.lazy(() =>
  import('@elastic/eui/es/components/icon/assets/bell_slash').then(({ icon }) => ({
    default: icon,
  }))
);

export const episodeSnoozedTriggerPublicDefinition: PublicTriggerDefinition = {
  ...episodeSnoozedTriggerCommonDefinition,
  icon: EpisodeSnoozedIcon,
};
