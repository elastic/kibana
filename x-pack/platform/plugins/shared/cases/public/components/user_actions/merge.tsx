/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { i18n as kbnI18n } from '@kbn/i18n';
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
  MergeCounts,
  MergeNotCopiedField,
  MergeSource,
  MergeUpdatedField,
  MergeUserAction,
} from '../../../common/types/domain';
import { MergeCaseLink } from '../merge_cases/merge_case_link';
import { getCaseReference } from '../merge_cases/utils';
import type { UserActionBuilder } from './types';
import { createCommonUpdateUserActionBuilder } from './common';
import * as i18n from './translations';

/** Renders "#118, #121 and #124" with each case as a link, in the locale's list style. */
const MergeCaseLinks = React.memo<{ cases: MergeCaseSnapshot[] }>(({ cases }) => {
  const references = cases.map((caseSnapshot) => getCaseReference(caseSnapshot));
  let parts: Array<{ type: string; value: string }>;
  try {
    parts = new Intl.ListFormat(kbnI18n.getLocale(), {
      style: 'long',
      type: 'conjunction',
    }).formatToParts(references);
  } catch {
    parts = references.flatMap((value, index) =>
      index === 0
        ? [{ type: 'element', value }]
        : [
            { type: 'literal', value: ', ' },
            { type: 'element', value },
          ]
    );
  }

  let elementIndex = 0;
  return (
    <>
      {parts.map((part, index) => {
        if (part.type !== 'element') {
          return <React.Fragment key={`literal-${index}`}>{part.value}</React.Fragment>;
        }
        const caseSnapshot = cases[elementIndex];
        elementIndex += 1;
        return caseSnapshot != null ? (
          <MergeCaseLink key={caseSnapshot.id} caseSnapshot={caseSnapshot} />
        ) : null;
      })}
    </>
  );
});
MergeCaseLinks.displayName = 'MergeCaseLinks';

const COUNT_FORMATTERS: ReadonlyArray<readonly [keyof MergeCounts, (count: number) => string]> = [
  ['alerts', i18n.MERGE_COPIED_ALERTS],
  ['attacks', i18n.MERGE_COPIED_ATTACKS],
  ['events', i18n.MERGE_COPIED_EVENTS],
  ['observables', i18n.MERGE_COPIED_OBSERVABLES],
  ['other', i18n.MERGE_COPIED_OTHER],
];

/** Lists the counts by kind, leaving out the kinds with none. */
const formatCounts = (counts: MergeCounts): string =>
  COUNT_FORMATTERS.filter(([kind]) => (counts[kind] ?? 0) > 0)
    .map(([kind, format]) => format(counts[kind]))
    .join(', ');

const UPDATED_FIELD_LABELS: Readonly<Partial<Record<MergeUpdatedField['field'], string>>> = {
  title: i18n.MERGE_UPDATED_FIELD_TITLE,
  description: i18n.MERGE_UPDATED_FIELD_DESCRIPTION,
  severity: i18n.MERGE_UPDATED_FIELD_SEVERITY,
  category: i18n.MERGE_UPDATED_FIELD_CATEGORY,
  tags: i18n.MERGE_UPDATED_FIELD_TAGS,
  assignees: i18n.MERGE_UPDATED_FIELD_ASSIGNEES,
  connector: i18n.MERGE_UPDATED_FIELD_CONNECTOR,
  template: i18n.MERGE_UPDATED_FIELD_TEMPLATE,
};

/** Custom and template fields carry the label they had at merge time. */
const getUpdatedFieldLabel = ({ field, key, label }: MergeUpdatedField): string =>
  label ?? UPDATED_FIELD_LABELS[field] ?? key ?? field;

const MergeSourceDetails = React.memo<{ source: MergeSource }>(({ source }) => {
  const { id, outcome, closed, copied, existing, leftOut } = source;
  const added = formatCounts(copied);
  const alreadyInCase = formatCounts(existing);
  const stayed = formatCounts(leftOut);

  return (
    <li data-test-subj={`merge-user-action-details-${id}`}>
      <strong>{getCaseReference(source)}</strong>
      {outcome === 'notMerged' ? (
        <div data-test-subj={`merge-user-action-details-${id}-not-merged`}>
          {i18n.MERGE_SOURCE_NOT_MERGED}
        </div>
      ) : null}
      <div>{added ? i18n.MERGE_SOURCE_NEW(added) : i18n.MERGE_SOURCE_NOTHING_NEW}</div>
      {alreadyInCase ? <div>{i18n.MERGE_SOURCE_ALREADY_IN_CASE(alreadyInCase)}</div> : null}
      {stayed ? <div>{i18n.MERGE_SOURCE_LEFT_OUT(stayed)}</div> : null}
      {closed ? <div>{i18n.MERGE_SOURCE_CLOSED}</div> : null}
    </li>
  );
});
MergeSourceDetails.displayName = 'MergeSourceDetails';

const MergeSourcesDetails = React.memo<{
  sources: MergeSource[];
  updatedFields: MergeUpdatedField[];
  notCopiedFields: MergeNotCopiedField[];
}>(({ sources, updatedFields, notCopiedFields }) => {
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
            {i18n.MERGE_UPDATED_FIELDS(updatedFields.map(getUpdatedFieldLabel).join(', '))}
          </p>
        ) : null}
        {notCopiedFields.length > 0 ? (
          <p data-test-subj="merge-user-action-details-not-copied-fields">
            {i18n.MERGE_NOT_COPIED_FIELDS(notCopiedFields.map(({ label }) => label).join(', '))}
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
    const { destination, sources, updatedFields = [], notCopiedFields = [] } = action.payload.merge;

    if (caseData.id !== destination.id) {
      return createCommonUpdateUserActionBuilder({
        userProfiles,
        userAction,
        handleOutlineComment,
        label: (
          <EuiText size="s" data-test-subj="merge-user-action-source">
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

    const mergedSources = sources.filter(({ outcome }) => outcome !== 'notMerged');
    const label = (
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
        <EuiFlexItem grow={false}>
          <EuiText size="s" data-test-subj="merge-user-action-destination">
            <FormattedMessage
              id="xpack.cases.caseView.userActions.merge.mergedCasesIntoThisCase"
              defaultMessage="merged {cases} into this case"
              values={{
                cases: (
                  <MergeCaseLinks cases={mergedSources.length > 0 ? mergedSources : sources} />
                ),
              }}
            />
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <MergeSourcesDetails
            sources={sources}
            updatedFields={updatedFields}
            notCopiedFields={notCopiedFields}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
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
