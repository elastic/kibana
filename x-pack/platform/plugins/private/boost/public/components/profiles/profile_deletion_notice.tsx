/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { CoreStart } from '@kbn/core/public';
import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiBasicTable,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiText,
  htmlIdGenerator,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { toMountPoint } from '@kbn/react-kibana-mount';
import type { FailedDeletion, ProfileDeletion } from '../../hooks/use_boost_state';
import { MODAL_WIDTH } from '../modal_width';

type NoticeServices = Pick<CoreStart, 'notifications' | 'overlays' | 'rendering'>;

const VIEW_DETAILS_LABEL = i18n.translate('xpack.boost.profileDeletion.viewDetails', {
  defaultMessage: 'View details',
});

// What a profile's deletion did when something failed, which the toast and its details both say.
const getFailureSummary = ({ ruleCount, failures }: ProfileDeletion): string => {
  const failedRuleCount = failures.filter(({ kind }) => kind === 'rule').length;
  return failedRuleCount > 0
    ? i18n.translate('xpack.boost.profileDeletion.rulesFailed', {
        defaultMessage:
          "{ruleCount, plural, one {Couldn't delete the rule that uses it} other {Couldn't delete {failedRuleCount} of the # rules that use it}}, so the profile was kept.",
        values: { ruleCount, failedRuleCount },
      })
    : i18n.translate('xpack.boost.profileDeletion.profileFailed', {
        defaultMessage:
          '{ruleCount, plural, one {Deleted the rule that used it} other {Deleted the # rules that used it}}, but not the profile.',
        values: { ruleCount },
      });
};

interface DeletionFailuresProps {
  title: string;
  /** The title's ID, which labels the modal. */
  titleId: string;
  summary: string;
  failures: readonly FailedDeletion[];
  onClose: () => void;
}

/**
 * The details of a profile's deletion that partly failed: what it couldn't delete, and why. Only
 * rules fail, or else the profile, since the profile is only deleted once its rules are.
 */
const DeletionFailures = ({
  title,
  titleId,
  summary,
  failures,
  onClose,
}: DeletionFailuresProps) => {
  const columns: Array<EuiBasicTableColumn<FailedDeletion>> = [
    {
      field: 'name',
      name:
        failures[0]?.kind === 'profile'
          ? i18n.translate('xpack.boost.profileDeletion.profileColumn', {
              defaultMessage: 'Boost profile',
            })
          : i18n.translate('xpack.boost.profileDeletion.ruleColumn', {
              defaultMessage: 'Boost rule',
            }),
      width: '35%',
    },
    {
      field: 'message',
      name: i18n.translate('xpack.boost.profileDeletion.errorColumn', {
        defaultMessage: 'Error',
      }),
    },
  ];

  return (
    <div css={{ inlineSize: MODAL_WIDTH, maxInlineSize: '100%' }}>
      <EuiModalHeader>
        <EuiModalHeaderTitle id={titleId}>{title}</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiText size="s">
          <p>
            {summary}{' '}
            {i18n.translate('xpack.boost.profileDeletion.tryAgain', {
              defaultMessage: 'To try again, delete the profile again.',
            })}
          </p>
        </EuiText>
        <EuiSpacer size="m" />
        <EuiBasicTable
          tableCaption={i18n.translate('xpack.boost.profileDeletion.failuresCaption', {
            defaultMessage: "What couldn't be deleted, and why",
          })}
          items={[...failures]}
          itemId="name"
          columns={columns}
          data-test-subj="boostDeletionFailures"
        />
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButton size="s" fill onClick={onClose} data-test-subj="boostDeletionFailuresClose">
          {i18n.translate('xpack.boost.profileDeletion.close', { defaultMessage: 'Close' })}
        </EuiButton>
      </EuiModalFooter>
    </div>
  );
};

/**
 * Says what deleting a profile and the rules that use it did. When it all worked, a success toast
 * counts the rules too. When something failed, a danger toast says what was kept, with a button that
 * opens the details of what couldn't be deleted, and why.
 */
export const notifyProfileDeletion = (
  { notifications: { toasts }, overlays, rendering }: NoticeServices,
  name: string,
  deletion: ProfileDeletion
): void => {
  const { ruleCount, failures } = deletion;
  if (failures.length === 0) {
    toasts.addSuccess(
      ruleCount === 0
        ? i18n.translate('xpack.boost.profilesTab.deletedToast', {
            defaultMessage: 'Deleted boost profile "{name}"',
            values: { name },
          })
        : i18n.translate('xpack.boost.profileDeletion.deletedWithRules', {
            defaultMessage:
              'Deleted boost profile "{name}" and {ruleCount, plural, one {# rule} other {# rules}}',
            values: { name, ruleCount },
          })
    );
    return;
  }

  const title = i18n.translate('xpack.boost.profileDeletion.failedTitle', {
    defaultMessage: 'Unable to delete boost profile "{name}"',
    values: { name },
  });
  // Without rules, nothing else was deleted, so the error says it all.
  if (ruleCount === 0) {
    toasts.addDanger({ title, text: failures[0].message });
    return;
  }

  const summary = getFailureSummary(deletion);
  const openDetails = () => {
    const titleId = htmlIdGenerator('boostDeletionFailuresTitle')();
    const modal = overlays.openModal(
      toMountPoint(
        <DeletionFailures
          title={title}
          titleId={titleId}
          summary={summary}
          failures={failures}
          onClose={() => modal.close()}
        />,
        rendering
      ),
      {
        maxWidth: MODAL_WIDTH,
        'aria-labelledby': titleId,
        'data-test-subj': 'boostDeletionFailuresModal',
      }
    );
  };
  toasts.addDanger({
    title,
    text: toMountPoint(
      <>
        <p>{summary}</p>
        <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiButton
              size="s"
              color="danger"
              onClick={openDetails}
              data-test-subj="boostDeletionViewDetails"
            >
              {VIEW_DETAILS_LABEL}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </>,
      rendering
    ),
  });
};
