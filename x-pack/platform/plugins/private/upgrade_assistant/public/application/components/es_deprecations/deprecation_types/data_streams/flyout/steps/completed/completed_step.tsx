/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiFlyoutBody, EuiSpacer, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { DataStreamMetadata } from '../../../../../../../../../common/types';

interface Props {
  meta: DataStreamMetadata;
}

export const ReindexingCompletedFlyoutStep: React.FunctionComponent<Props> = ({ meta }: Props) => {
  return (
    <>
      <EuiFlyoutBody>
        <EuiTitle size="s">
          <h3>
            <FormattedMessage
              id="xpack.upgradeAssistant.dataStream.reindexing.flyout.warningsStep.acceptChangesTitle"
              defaultMessage="Data Stream Reindexing Complete"
            />
          </h3>
        </EuiTitle>
        <EuiSpacer size="m" />
        <p>
          <FormattedMessage
            id="xpack.upgradeAssistant.dataStream.reindexing.flyout.warningsStep.acceptChangesTitle"
            defaultMessage="Success! {count, plural, =1 {# backing index} other {# backing indices}} successfully reindexed."
            values={{ count: meta.indicesRequiringUpgradeCount }}
          />
        </p>
      </EuiFlyoutBody>
    </>
  );
};
