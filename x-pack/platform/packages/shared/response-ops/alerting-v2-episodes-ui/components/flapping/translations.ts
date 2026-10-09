/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { DEFAULT_EPISODE_FLAPPING_SETTINGS } from '../../utils/is_episode_flapping';

export const FLAPPING_BADGE_LABEL = i18n.translate(
  'xpack.alertingV2EpisodesUi.flapping.badgeLabel',
  {
    defaultMessage: 'Flapping',
  }
);

export const FLAPPING_BADGE_ARIA_LABEL = i18n.translate(
  'xpack.alertingV2EpisodesUi.flapping.badgeAriaLabel',
  {
    defaultMessage: 'Flapping — show details',
  }
);

export const FLAPPING_POPOVER_TITLE = i18n.translate(
  'xpack.alertingV2EpisodesUi.flapping.popoverTitle',
  {
    defaultMessage: 'Flapping detected',
  }
);

export const FLAPPING_POPOVER_BODY = i18n.translate(
  'xpack.alertingV2EpisodesUi.flapping.popoverBody',
  {
    defaultMessage:
      'This episode changed between active and recovering at least {statusChangeThreshold} times in the last {lookBackWindow} rule events.',
    values: {
      statusChangeThreshold: DEFAULT_EPISODE_FLAPPING_SETTINGS.statusChangeThreshold,
      lookBackWindow: DEFAULT_EPISODE_FLAPPING_SETTINGS.lookBackWindow,
    },
  }
);
