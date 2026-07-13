/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import { EuiCallOut, EuiFlexGroup, EuiFlexItem, EuiButton, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

export interface MergeInProgressCalloutProps {
  /** Name of the canonical tag the running job is merging into, if resolvable. */
  tagName: string | undefined;
  onViewProgress: () => void;
}

/**
 * Merge jobs are singleton per space and run entirely server-side, so a job can still be running
 * after the flyout that started it was closed (or started from another browser tab/session). This
 * makes that discoverable from the Tag Management page itself, without having to reopen the
 * flyout for a specific duplicate group first (which may 409 on "Start merge" without explaining
 * why — see the flyout's own on-mount reattach check for the other half of this fix).
 */
export const MergeInProgressCallout: FC<MergeInProgressCalloutProps> = ({
  tagName,
  onViewProgress,
}) => {
  return (
    <>
      <EuiCallOut
        data-test-subj="tagsMergeInProgressCallout"
        color="primary"
        iconType="clock"
        title={
          tagName
            ? i18n.translate('xpack.savedObjectsTagging.management.mergeInProgress.titleWithName', {
                defaultMessage: 'A tag merge into "{name}" is currently running.',
                values: { name: tagName },
              })
            : i18n.translate('xpack.savedObjectsTagging.management.mergeInProgress.title', {
                defaultMessage: 'A tag merge is currently running.',
              })
        }
      >
        <EuiFlexGroup justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiButton
              size="s"
              data-test-subj="tagsMergeInProgressViewProgressButton"
              onClick={onViewProgress}
            >
              <FormattedMessage
                id="xpack.savedObjectsTagging.management.mergeInProgress.viewProgressButton"
                defaultMessage="View progress"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiCallOut>
      <EuiSpacer size="l" />
    </>
  );
};
