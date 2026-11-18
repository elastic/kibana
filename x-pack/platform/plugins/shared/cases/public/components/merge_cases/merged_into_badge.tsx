/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge } from '@elastic/eui';
import type { MergeCaseSnapshot } from '../../../common/types/domain';
import type { CaseUI } from '../../containers/types';
import { useGetMergeDestinations } from '../../containers/use_get_merge_destinations';
import { CaseDetailsLink } from '../links';
import { getCaseReference, getLatestDestinationId } from './utils';
import * as i18n from './translations';

interface MergedIntoBadgeProps {
  merge: CaseUI['merge'];
  /** Destinations fetched once for a page of cases. Without it the badge fetches its own. */
  destinations?: Map<string, MergeCaseSnapshot>;
}

/**
 * "Merged into #142", linking to the latest case this case was merged into. It reads "Merged"
 * until the destination loads, and names the destination by title until it has a number.
 */
export const MergedIntoBadge = React.memo<MergedIntoBadgeProps>(({ merge, destinations }) => {
  const destinationId = getLatestDestinationId(merge);
  const { data: fetchedDestinations } = useGetMergeDestinations(
    destinationId != null ? [destinationId] : [],
    { enabled: destinations == null }
  );

  if (destinationId == null) {
    return null;
  }

  const destination = (destinations ?? fetchedDestinations)?.get(destinationId);
  if (destination == null) {
    return (
      <EuiBadge color="hollow" iconType="merge" data-test-subj="case-merged-into-badge">
        {i18n.MERGED}
      </EuiBadge>
    );
  }

  return (
    <CaseDetailsLink detailName={destination.id} title={destination.title}>
      <EuiBadge color="hollow" iconType="merge" data-test-subj="case-merged-into-badge">
        {i18n.MERGED_INTO(getCaseReference(destination))}
      </EuiBadge>
    </CaseDetailsLink>
  );
});
MergedIntoBadge.displayName = 'MergedIntoBadge';
