/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { SnakeToCamelCase } from '../../../common/types';
import type { MergeCaseSnapshot, MergeSource, MergeUserAction } from '../../../common/types/domain';
import { MergeCaseLink } from '../merge_cases/merge_case_link';
import { getCaseReference } from '../merge_cases/utils';
import type { UserActionBuilder } from './types';
import { createCommonUpdateUserActionBuilder } from './common';
import * as i18n from './translations';

const MergeCaseLinks = React.memo<{ cases: MergeCaseSnapshot[] }>(({ cases }) => (
  <>
    {cases.map((caseSnapshot, index) => (
      <React.Fragment key={caseSnapshot.id}>
        {index > 0 ? ', ' : null}
        <MergeCaseLink caseSnapshot={caseSnapshot} />
      </React.Fragment>
    ))}
  </>
));
MergeCaseLinks.displayName = 'MergeCaseLinks';

const MergeSourcesDetails = React.memo<{ sources: MergeSource[] }>(({ sources }) => {
  const [isOpen, setIsOpen] = useState(false);
  const popoverId = useGeneratedHtmlId({ prefix: 'mergeSourcesDetails' });

  return (
    <EuiPopover
      id={popoverId}
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      anchorPosition="downLeft"
      aria-label={i18n.MERGE_DETAILS}
      button={
        <EuiButtonEmpty
          size="xs"
          flush="both"
          onClick={() => setIsOpen((open) => !open)}
          aria-expanded={isOpen}
          aria-controls={popoverId}
          data-test-subj="merge-user-action-details-button"
        >
          {i18n.MERGE_DETAILS}
        </EuiButtonEmpty>
      }
    >
      <EuiText size="s" data-test-subj="merge-user-action-details">
        <ul>
          {sources.map((source) => (
            <li key={source.id}>
              <FormattedMessage
                id="xpack.cases.caseView.userActions.merge.sourceCopiedTotals"
                defaultMessage="{caseRef}: {alerts, plural, one {# alert} other {# alerts}}, {events, plural, one {# event} other {# events}}, {observables, plural, one {# observable} other {# observables}}, {other, plural, one {# other attachment} other {# other attachments}}"
                values={{
                  caseRef: getCaseReference(source),
                  alerts: source.copied.alerts,
                  events: source.copied.events,
                  observables: source.copied.observables,
                  other: source.copied.other,
                }}
              />
            </li>
          ))}
        </ul>
      </EuiText>
    </EuiPopover>
  );
});
MergeSourcesDetails.displayName = 'MergeSourcesDetails';

export const createMergeUserActionBuilder: UserActionBuilder = ({
  caseData,
  userAction,
  userProfiles,
  handleOutlineComment,
}) => ({
  build: () => {
    const action = userAction as SnakeToCamelCase<MergeUserAction>;
    const { destination, sources } = action.payload.merge;
    const isDestination = caseData.id === destination.id;

    const label = isDestination ? (
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
        <EuiFlexItem grow={false}>
          <EuiText size="s" data-test-subj="merge-user-action-destination">
            <FormattedMessage
              id="xpack.cases.caseView.userActions.merge.mergedIntoThisCase"
              defaultMessage="merged {cases} into this case"
              values={{ cases: <MergeCaseLinks cases={sources} /> }}
            />
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <MergeSourcesDetails sources={sources} />
        </EuiFlexItem>
      </EuiFlexGroup>
    ) : (
      <EuiText size="s" data-test-subj="merge-user-action-original">
        <FormattedMessage
          id="xpack.cases.caseView.userActions.merge.mergedThisCaseInto"
          defaultMessage="merged this case into {destination}"
          values={{ destination: <MergeCaseLink caseSnapshot={destination} /> }}
        />
      </EuiText>
    );

    return createCommonUpdateUserActionBuilder({
      userProfiles,
      userAction,
      handleOutlineComment,
      label,
      icon: 'merge',
    }).build();
  },
});
