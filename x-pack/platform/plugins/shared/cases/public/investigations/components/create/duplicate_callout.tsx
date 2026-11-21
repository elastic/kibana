/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import type { RelatedRecord } from '../../../../common/investigations/types';
import { useInvestigationsNavigation } from '../../hooks';
import { ICONS } from '../../icons';
import { getReasonLabels } from '../detail/related_reasons';
import { StatusBadge } from '../shared/status_badge';
import * as i18n from './translations';

export interface DuplicateCalloutProps {
  related: RelatedRecord[];
  /** Shown while the user can still decide to create anyway. */
  onCreateAnyway?: () => void;
  isCreating?: boolean;
}

/** Lists open or recent investigations that look like the one being created. */
export const DuplicateCallout: React.FC<DuplicateCalloutProps> = ({
  related,
  onCreateAnyway,
  isCreating = false,
}) => {
  const { getRecordPath, getHref } = useInvestigationsNavigation();

  return (
    <EuiCallOut
      color="warning"
      iconType={ICONS.warning}
      title={i18n.DUPLICATES_TITLE(related.length)}
      role="alert"
      data-test-subj="investigationCreateDuplicates"
    >
      <p>{i18n.DUPLICATES_BODY}</p>
      <EuiFlexGroup direction="column" gutterSize="s" responsive={false}>
        {related.map((item) => {
          const { record } = item;
          return (
            <EuiFlexItem key={record.id} data-test-subj="investigationCreateDuplicateItem">
              <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
                <EuiFlexItem grow={false}>
                  <EuiText size="s">
                    <strong>{record.display_id}</strong>
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <StatusBadge status={record.status} owner={record.owner} />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiLink
                    href={getHref(getRecordPath(record.id))}
                    target="_blank"
                    rel="noopener noreferrer"
                    external
                    data-test-subj="investigationCreateDuplicateOpen"
                  >
                    {i18n.DUPLICATE_OPEN}
                  </EuiLink>
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiText size="s">{record.title}</EuiText>
              <EuiText size="xs" color="subdued">
                {i18n.DUPLICATE_WHY(getReasonLabels(item).join(', '))}
              </EuiText>
            </EuiFlexItem>
          );
        })}
      </EuiFlexGroup>
      {onCreateAnyway ? (
        <>
          <EuiSpacer size="m" />
          <EuiButton
            size="s"
            color="warning"
            isLoading={isCreating}
            onClick={onCreateAnyway}
            data-test-subj="investigationCreateAnyway"
          >
            {i18n.CREATE_ANYWAY}
          </EuiButton>
        </>
      ) : null}
    </EuiCallOut>
  );
};
DuplicateCallout.displayName = 'DuplicateCallout';

export interface DuplicateStatusProps extends DuplicateCalloutProps {
  isChecking: boolean;
  isError: boolean;
}

/** The progress, failure or result of the duplicate check, below the identifiers. */
export const DuplicateStatus: React.FC<DuplicateStatusProps> = ({
  isChecking,
  isError,
  related,
  onCreateAnyway,
  isCreating,
}) => (
  <>
    {isChecking ? (
      <EuiFlexGroup
        gutterSize="s"
        alignItems="center"
        responsive={false}
        role="status"
        aria-live="polite"
      >
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="s" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            {i18n.CHECKING_DUPLICATES}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    ) : null}
    {isError ? (
      <EuiCallOut announceOnMount size="s" color="warning" title={i18n.DUPLICATE_CHECK_ERROR} />
    ) : null}
    {related.length > 0 ? (
      <>
        <EuiSpacer size="m" />
        <DuplicateCallout
          related={related}
          onCreateAnyway={onCreateAnyway}
          isCreating={isCreating}
        />
      </>
    ) : null}
  </>
);
DuplicateStatus.displayName = 'DuplicateStatus';
