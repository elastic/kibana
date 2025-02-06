/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiFlyoutBody, EuiSpacer, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type {
  DataStreamMetadata,
  DataStreamResolutionType,
} from '../../../../../../../../../common/types';

interface Props {
  meta: DataStreamMetadata;
  resolutionType?: DataStreamResolutionType;
}

export const MigrationCompletedFlyoutStep: React.FunctionComponent<Props> = ({
  meta,
  resolutionType,
}: Props) => {
  return (
    <>
      <EuiFlyoutBody>
        <EuiTitle size="s">
          <h3>
            <FormattedMessage
              id="xpack.upgradeAssistant.dataStream.migration.flyout.warningsStep.acceptChangesTitle"
              defaultMessage="Data Stream Migration Complete"
            />
          </h3>
        </EuiTitle>
        <EuiSpacer size="m" />
        <p>
          <FormattedMessage
            id="xpack.upgradeAssistant.dataStream.migration.flyout.warningsStep.acceptChangesTitle"
            defaultMessage="Success! {count, plural, =1 {# backing index} other {# backing indices}} successfully {resolutionType, select, reindexing {reindexed} readonly {marked as readonly} other {executed}}."
            values={{ count: meta.indicesRequiringUpgradeCount, resolutionType }}
          />
        </p>
      </EuiFlyoutBody>
    </>
  );
};
