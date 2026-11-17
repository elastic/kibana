/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiBadge, EuiPopover, EuiText, useGeneratedHtmlId } from '@elastic/eui';
import type { MergeCaseSnapshot } from '../../../common/types/domain';
import { useCaseViewNavigation } from '../../common/navigation/hooks';
import { useGetMergeDestinations } from '../../containers/use_get_merge_destinations';
import { MergeCaseLink } from './merge_case_link';
import { getCaseReference } from './utils';
import * as i18n from './translations';

interface MergedIntoBadgeProps {
  destinationIds: string[];
  /** Destinations fetched once for a page of cases. Without it the badge fetches its own. */
  destinations?: Map<string, MergeCaseSnapshot>;
  /** Set to false where the badge sits inside another link. */
  isLink?: boolean;
}

export const MergedIntoBadge = React.memo<MergedIntoBadgeProps>(
  ({ destinationIds, destinations, isLink = true }) => {
    const { data: fetchedDestinations } = useGetMergeDestinations(destinationIds, {
      enabled: destinations == null,
    });
    const { getCaseViewUrl } = useCaseViewNavigation();
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const popoverId = useGeneratedHtmlId({ prefix: 'mergedIntoBadge' });

    const destinationsById = destinations ?? fetchedDestinations;
    const knownDestinations = destinationIds.flatMap((id) => {
      const destination = destinationsById?.get(id);
      return destination != null ? [destination] : [];
    });
    const label = i18n.MERGED_INTO_CASES(destinationIds.length);
    const [onlyDestination] = destinationIds.length === 1 ? knownDestinations : [];

    if (!isLink || knownDestinations.length === 0) {
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

    if (onlyDestination != null) {
      return (
        <EuiBadge
          color="hollow"
          iconType="merge"
          title={label}
          href={getCaseViewUrl({ detailName: onlyDestination.id })}
          target="_blank"
          aria-label={i18n.OPEN_CASE_IN_NEW_TAB(getCaseReference(onlyDestination))}
          data-test-subj="case-merged-into-badge"
        >
          {label}
        </EuiBadge>
      );
    }

    const badge = (
      <EuiBadge
        color="hollow"
        iconType="merge"
        title={label}
        onClick={() => setIsPopoverOpen((isOpen) => !isOpen)}
        onClickAriaLabel={i18n.MERGED_INTO_DESTINATIONS}
        data-test-subj="case-merged-into-badge"
      >
        {label}
      </EuiBadge>
    );

    return (
      <EuiPopover
        id={popoverId}
        button={badge}
        isOpen={isPopoverOpen}
        closePopover={() => setIsPopoverOpen(false)}
        anchorPosition="downLeft"
        aria-label={i18n.MERGED_INTO_DESTINATIONS}
      >
        <EuiText size="s" data-test-subj="case-merged-into-destinations">
          <ul>
            {knownDestinations.map((destination) => (
              <li key={destination.id}>
                <MergeCaseLink caseSnapshot={destination} />
              </li>
            ))}
          </ul>
        </EuiText>
      </EuiPopover>
    );
  }
);
MergedIntoBadge.displayName = 'MergedIntoBadge';
