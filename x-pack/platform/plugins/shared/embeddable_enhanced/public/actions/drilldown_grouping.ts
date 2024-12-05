/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { UiActionsPresentableGrouping as PresentableGrouping } from '@kbn/ui-actions-plugin/public';

export const drilldownGrouping: PresentableGrouping = [
  {
    id: 'drilldowns',
    getDisplayName: () =>
      i18n.translate('xpack.embeddableEnhanced.Drilldowns', {
        defaultMessage: 'Drilldowns',
      }),
    getIconType: () => 'symlink',
    order: 25,
  },
];
