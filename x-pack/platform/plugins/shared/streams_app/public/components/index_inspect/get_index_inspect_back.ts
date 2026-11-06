/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { StreamsAppRouter } from '../../routes/config';

interface IndexInspectBackParams {
  router: Pick<StreamsAppRouter, 'link'>;
  unitId?: string;
  rangeFrom?: string;
  rangeTo?: string;
}

/**
 * The index page back link: the destinations tab of the unit it was opened from, or the V2 landing
 * page when no unit is known.
 */
export const getIndexInspectBack = ({
  router,
  unitId,
  rangeFrom,
  rangeTo,
}: IndexInspectBackParams): { href: string; label: string } => {
  if (unitId) {
    return {
      href: router.link('/v2/unit/{unitId}/{tab}', {
        path: { unitId, tab: 'destinations' },
        query: { rangeFrom, rangeTo },
      }),
      label: i18n.translate('xpack.streams.indexInspect.page.backToDestinations', {
        defaultMessage: 'Destinations',
      }),
    };
  }

  return {
    href: router.link('/v2'),
    label: i18n.translate('xpack.streams.indexInspect.page.backToStreams', {
      defaultMessage: 'Streams',
    }),
  };
};
