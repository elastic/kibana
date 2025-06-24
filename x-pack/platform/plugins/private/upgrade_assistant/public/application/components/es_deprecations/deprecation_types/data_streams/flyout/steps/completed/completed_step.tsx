/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiFlyoutBody,
  EuiSpacer,
  EuiTitle,
  EuiFlyoutFooter,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type {
  DataStreamMetadata,
  DataStreamResolutionType,
} from '../../../../../../../../../common/types';

interface Props {
  meta?: DataStreamMetadata | null;
  resolutionType?: DataStreamResolutionType;
  closeFlyout: () => void;
}

export const MigrationCompletedFlyoutStep: React.FunctionComponent<Props> = ({
  meta,
  resolutionType,
  closeFlyout,
}: Props) => {
  return (
    <>
      <EuiFlyoutBody>
        <EuiTitle size="s">
          <h3 data-test-subj="dataStreamMigrationCompletedTitle">
            <FormattedMessage
              id="xpack.upgradeAssistant.dataStream.migration.flyout.warningsStep.acceptChangesTitle"
              defaultMessage="Data Stream Migration Complete"
            />
          </h3>
        </EuiTitle>
        <EuiSpacer size="m" />
        <p data-test-subj="dataStreamMigrationCompletedDescription">
          <FormattedMessage
            id="xpack.upgradeAssistant.dataStream.migration.flyout.warningsStep.acceptChangesTitle"
            defaultMessage="Success! {count, plural, =0 {backing indices} =1 {# backing index} other {# backing indices}} successfully {resolutionType, select, reindex {reindexed} readonly {marked as read-only} other {migrated}}."
            values={{ count: meta?.indicesRequiringUpgradeCount || 0, resolutionType }}
          />
        </p>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              iconType="cross"
              onClick={closeFlyout}
              flush="left"
              data-test-subj="closeDataStreamReindexingButton"
            >
              <FormattedMessage
                id="xpack.upgradeAssistant.dataStream.migration.flyout.completedStep.closeButtonLabel"
                defaultMessage="Close"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
};
