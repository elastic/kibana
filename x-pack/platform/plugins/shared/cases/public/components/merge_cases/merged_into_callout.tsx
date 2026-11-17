/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { KbnInfoCallout } from '@kbn/ui-callout';
import type { MergeCaseSnapshot } from '../../../common/types/domain';
import { useCaseViewNavigation } from '../../common/navigation/hooks';
import { useGetMergeDestinations } from '../../containers/use_get_merge_destinations';
import { MergeCaseLink } from './merge_case_link';
import { getCaseReference } from './utils';
import * as i18n from './translations';

const SingleDestinationCallout = React.memo<{ destination: MergeCaseSnapshot }>(
  ({ destination }) => {
    const { getCaseViewUrl } = useCaseViewNavigation();
    const { id, title, incrementalId } = destination;
    const caseRef = getCaseReference(destination);

    return (
      <KbnInfoCallout
        announceOnMount={false}
        size="s"
        title={
          incrementalId != null
            ? i18n.MERGED_INTO_CALLOUT_TITLE(caseRef, title)
            : i18n.MERGED_INTO(caseRef)
        }
        text={i18n.MERGED_INTO_CALLOUT_BODY(caseRef)}
        actionProps={{
          primary: {
            children: i18n.OPEN_CASE(caseRef),
            href: getCaseViewUrl({ detailName: id }),
            target: '_blank',
            iconType: 'external',
            iconSide: 'right',
            'aria-label': i18n.OPEN_CASE_IN_NEW_TAB(caseRef),
            'data-test-subj': 'case-merged-into-callout-open-case',
          },
        }}
        data-test-subj="case-merged-into-callout"
      />
    );
  }
);
SingleDestinationCallout.displayName = 'SingleDestinationCallout';

export const MergedIntoCallout = React.memo<{ destinationIds: string[] }>(({ destinationIds }) => {
  const { data: destinationsById, isLoading } = useGetMergeDestinations(destinationIds);

  if (isLoading) {
    return null;
  }

  const knownDestinations = destinationIds.flatMap((id) => {
    const destination = destinationsById?.get(id);
    return destination != null ? [destination] : [];
  });
  const unavailableCount = destinationIds.length - knownDestinations.length;

  if (knownDestinations.length === 0) {
    return (
      <KbnInfoCallout
        announceOnMount={false}
        size="s"
        title={i18n.MERGED_INTO_ANOTHER_CASE(destinationIds.length)}
        text={i18n.MERGED_INTO_ANOTHER_CASE_BODY(destinationIds.length)}
        data-test-subj="case-merged-into-callout"
      />
    );
  }

  if (destinationIds.length === 1) {
    return <SingleDestinationCallout destination={knownDestinations[0]} />;
  }

  return (
    <KbnInfoCallout
      announceOnMount={false}
      size="s"
      title={i18n.MERGED_INTO_CASES(destinationIds.length)}
      text={
        <>
          <ul data-test-subj="case-merged-into-callout-destinations">
            {knownDestinations.map((destination) => (
              <li key={destination.id}>
                {destination.incrementalId != null ? (
                  <FormattedMessage
                    id="xpack.cases.mergeCases.mergedIntoCalloutDestination"
                    defaultMessage="{caseLink}: {title}"
                    values={{
                      caseLink: <MergeCaseLink caseSnapshot={destination} />,
                      title: destination.title,
                    }}
                  />
                ) : (
                  <MergeCaseLink caseSnapshot={destination} />
                )}
              </li>
            ))}
          </ul>
          <p>{i18n.MERGED_INTO_CASES_CALLOUT_BODY}</p>
          {unavailableCount > 0 ? (
            <p>{i18n.MERGED_INTO_UNAVAILABLE_CASES(unavailableCount)}</p>
          ) : null}
        </>
      }
      data-test-subj="case-merged-into-callout"
    />
  );
});
MergedIntoCallout.displayName = 'MergedIntoCallout';
