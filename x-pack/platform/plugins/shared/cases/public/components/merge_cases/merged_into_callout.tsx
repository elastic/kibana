/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { KbnInfoCallout } from '@kbn/ui-callout';
import { useCaseViewNavigation } from '../../common/navigation/hooks';
import { useGetMergeDestinations } from '../../containers/use_get_merge_destinations';
import { getCaseReference } from './utils';
import * as i18n from './translations';

export const MergedIntoCallout = React.memo<{ destinationId: string }>(({ destinationId }) => {
  const { data: destinations, isLoading } = useGetMergeDestinations([destinationId]);
  const { getCaseViewUrl, navigateToCaseView } = useCaseViewNavigation();
  const destination = destinations?.get(destinationId);

  const onOpenCase = useCallback(
    (event: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => {
      event.preventDefault();
      navigateToCaseView({ detailName: destinationId });
    },
    [destinationId, navigateToCaseView]
  );

  if (isLoading) {
    return null;
  }

  if (destination == null) {
    return (
      <KbnInfoCallout
        announceOnMount={false}
        size="s"
        title={i18n.MERGED_INTO_ANOTHER_CASE}
        text={i18n.MERGED_INTO_ANOTHER_CASE_BODY}
        data-test-subj="case-merged-into-callout"
      />
    );
  }

  const caseRef = getCaseReference(destination);
  const title =
    destination.incrementalId != null
      ? i18n.MERGED_INTO_CALLOUT_TITLE(caseRef, destination.title)
      : i18n.MERGED_INTO(caseRef);

  return (
    <KbnInfoCallout
      announceOnMount={false}
      size="s"
      title={title}
      text={i18n.MERGED_INTO_CALLOUT_BODY(caseRef)}
      actionProps={{
        primary: {
          children: i18n.OPEN_CASE(caseRef),
          href: getCaseViewUrl({ detailName: destinationId }),
          onClick: onOpenCase,
          'data-test-subj': 'case-merged-into-callout-open-case',
        },
      }}
      data-test-subj="case-merged-into-callout"
    />
  );
});
MergedIntoCallout.displayName = 'MergedIntoCallout';
