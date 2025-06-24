/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

export const FeedbackFlyout = () => {
  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="xs">
          {/* TODO: Align close button  */}
          <h2>
            <FormattedMessage id="xpack.intercept.feedbackFlyout.title" defaultMessage="Feedback" />
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>TODO</EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              iconType="send" // TODO: Get correct icon, this one doesn't exist in EUI
              onClick={() => {}} // TODO: Implement send feedback logic
              data-test-subj="sendFeedbackButton"
            >
              <FormattedMessage id="xpack.intercept.feedbackFlyout.send" defaultMessage="Send" />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
};
