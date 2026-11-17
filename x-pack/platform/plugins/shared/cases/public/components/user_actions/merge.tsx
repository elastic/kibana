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
import type {
  MergeCaseSnapshot,
  MergeCopiedTotals,
  MergeSource,
  MergeUpdatedField,
  MergeUserAction,
} from '../../../common/types/domain';
import { MergeCaseLink } from '../merge_cases/merge_case_link';
import { getCaseReference } from '../merge_cases/utils';
import { HoverableUsernameResolver } from '../user_profiles/hoverable_username_resolver';
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

const COPIED_KIND_FORMATTERS: ReadonlyArray<
  readonly [keyof MergeCopiedTotals, (count: number) => string]
> = [
  ['alerts', i18n.MERGE_COPIED_ALERTS],
  ['events', i18n.MERGE_COPIED_EVENTS],
  ['observables', i18n.MERGE_COPIED_OBSERVABLES],
  ['other', i18n.MERGE_COPIED_OTHER],
];

/** Lists the counts by kind, leaving out the kinds with none. */
const formatCounts = (counts: MergeCopiedTotals): string =>
  COPIED_KIND_FORMATTERS.filter(([kind]) => counts[kind] > 0)
    .map(([kind, format]) => format(counts[kind]))
    .join(', ');

const UPDATED_FIELD_LABELS: Readonly<Record<MergeUpdatedField, string>> = {
  title: i18n.MERGE_UPDATED_FIELD_TITLE,
  description: i18n.MERGE_UPDATED_FIELD_DESCRIPTION,
  severity: i18n.MERGE_UPDATED_FIELD_SEVERITY,
  category: i18n.MERGE_UPDATED_FIELD_CATEGORY,
  tags: i18n.MERGE_UPDATED_FIELD_TAGS,
  assignees: i18n.MERGE_UPDATED_FIELD_ASSIGNEES,
};

const MergeSourceDetails = React.memo<{ source: MergeSource }>(({ source }) => {
  const { id, copied, duplicates, excluded } = source;
  const added = formatCounts(copied);
  const alreadyInCase = duplicates != null ? formatCounts(duplicates) : '';
  const leftOut = excluded != null ? formatCounts(excluded) : '';

  return (
    <li data-test-subj={`merge-user-action-details-${id}`}>
      <strong>{getCaseReference(source)}</strong>
      <div>{added ? i18n.MERGE_SOURCE_NEW(added) : i18n.MERGE_SOURCE_NOTHING_NEW}</div>
      {alreadyInCase ? <div>{i18n.MERGE_SOURCE_ALREADY_IN_CASE(alreadyInCase)}</div> : null}
      {leftOut ? <div>{i18n.MERGE_SOURCE_LEFT_OUT(leftOut)}</div> : null}
    </li>
  );
});
MergeSourceDetails.displayName = 'MergeSourceDetails';

const MergeSourcesDetails = React.memo<{
  sources: MergeSource[];
  updatedFields: MergeUpdatedField[];
}>(({ sources, updatedFields }) => {
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
            <MergeSourceDetails key={source.id} source={source} />
          ))}
        </ul>
        {updatedFields.length > 0 ? (
          <p data-test-subj="merge-user-action-details-updated-fields">
            {i18n.MERGE_UPDATED_FIELDS(
              updatedFields.map((field) => UPDATED_FIELD_LABELS[field]).join(', ')
            )}
          </p>
        ) : null}
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
    const { destination, sources, updatedFields = [] } = action.payload.merge;

    if (caseData.id !== destination.id) {
      return createCommonUpdateUserActionBuilder({
        userProfiles,
        userAction,
        handleOutlineComment,
        label: (
          <EuiText size="s" data-test-subj="merge-user-action-original">
            <FormattedMessage
              id="xpack.cases.caseView.userActions.merge.mergedThisCaseInto"
              defaultMessage="merged this case into {destination}"
              values={{ destination: <MergeCaseLink caseSnapshot={destination} /> }}
            />
          </EuiText>
        ),
        icon: 'merge',
      }).build();
    }

    const label = (
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
        <EuiFlexItem grow={false}>
          <EuiText size="s" data-test-subj="merge-user-action-destination">
            <FormattedMessage
              id="xpack.cases.caseView.userActions.merge.casesMergedIntoThisCaseBy"
              defaultMessage="{count, plural, one {Case} other {Cases}} {cases} merged into this case by {user}"
              values={{
                count: sources.length,
                cases: <MergeCaseLinks cases={sources} />,
                user: (
                  <HoverableUsernameResolver user={action.createdBy} userProfiles={userProfiles} />
                ),
              }}
            />
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <MergeSourcesDetails sources={sources} updatedFields={updatedFields} />
        </EuiFlexItem>
      </EuiFlexGroup>
    );

    return createCommonUpdateUserActionBuilder({
      userProfiles,
      userAction,
      handleOutlineComment,
      label,
      icon: 'merge',
      username: '',
    }).build();
  },
});
