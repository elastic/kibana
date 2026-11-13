/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiBadge } from '@elastic/eui';
import type { MergeCaseSnapshot } from '../../../common/types/domain';
import { useCaseViewNavigation } from '../../common/navigation/hooks';
import { useGetMergeDestinations } from '../../containers/use_get_merge_destinations';
import { getCaseReference } from './utils';
import * as i18n from './translations';

interface MergedIntoBadgeProps {
  destinationId: string;
  /** Destinations fetched once for a page of cases. Without it the badge fetches its own. */
  destinations?: Map<string, MergeCaseSnapshot>;
  /** Set to false where the badge sits inside another link. */
  isLink?: boolean;
}

export const MergedIntoBadge = React.memo<MergedIntoBadgeProps>(
  ({ destinationId, destinations, isLink = true }) => {
    const { data: fetchedDestinations } = useGetMergeDestinations([destinationId], {
      enabled: destinations == null,
    });
    const { navigateToCaseView } = useCaseViewNavigation();
    const destination = (destinations ?? fetchedDestinations)?.get(destinationId);

    const onClick = useCallback(
      () => navigateToCaseView({ detailName: destinationId }),
      [destinationId, navigateToCaseView]
    );

    const label = destination ? i18n.MERGED_INTO(getCaseReference(destination)) : i18n.MERGED;

    if (!isLink || destination == null) {
      return (
        <EuiBadge
          color="hollow"
          iconType="merge"
          title={label}
          data-test-subj="case-merged-into-badge"
        >
          {label}
        </EuiBadge>
      );
    }

    return (
      <EuiBadge
        color="hollow"
        iconType="merge"
        title={label}
        onClick={onClick}
        onClickAriaLabel={i18n.OPEN_CASE(getCaseReference(destination))}
        data-test-subj="case-merged-into-badge"
      >
        {label}
      </EuiBadge>
    );
  }
);
MergedIntoBadge.displayName = 'MergedIntoBadge';
