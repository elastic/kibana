/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

/** Shows how many services a collection tile (e.g. AWS onboarding) bundles behind it. */
export const CollectionSizeBadge = ({ count }: { count: number }) => (
  <EuiBadge color="hollow" iconType="layers" data-test-subj="packageCardCollectionSizeBadge">
    {i18n.translate('xpack.fleet.packageCard.collectionSizeBadge.label', {
      defaultMessage: 'Collection of {count}',
      values: { count },
    })}
  </EuiBadge>
);
