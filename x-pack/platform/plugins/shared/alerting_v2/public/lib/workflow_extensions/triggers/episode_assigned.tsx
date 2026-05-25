/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { PublicTriggerDefinition } from '@kbn/workflows-extensions/public';
import { episodeAssignedTriggerCommonDefinition } from '../../../../common/workflows/triggers';

const EpisodeAssignedIcon = React.lazy(() =>
  // @ts-expect-error EUI does not ship `.d.ts` files for deep `icon/assets/*`
  // subpaths. Other plugins work around this with an ambient `eui_icons.d.ts`
  // (see e.g. x-pack/platform/plugins/shared/cases/public/workflows/eui_icons.d.ts).
  import('@elastic/eui/es/components/icon/assets/user').then(({ icon }) => ({
    default: icon,
  }))
);

export const episodeAssignedTriggerPublicDefinition: PublicTriggerDefinition = {
  ...episodeAssignedTriggerCommonDefinition,
  icon: EpisodeAssignedIcon,
};
