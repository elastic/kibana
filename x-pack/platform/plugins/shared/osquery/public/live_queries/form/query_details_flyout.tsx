/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlyout,
  EuiTitle,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiPortal,
  EuiFlexItem,
  EuiCodeBlock,
  EuiSpacer,
  useEuiTheme,
} from '@elastic/eui';
import React, { useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

interface QueryDetailsFlyoutProps {
  action: {
    id: string;
    query: string;
  };
  onClose: () => void;
}

const QueryDetailsFlyoutComponent: React.FC<QueryDetailsFlyoutProps> = ({ action, onClose }) => {
  const { euiTheme } = useEuiTheme();

  // we need this flyout to be above the timeline flyout (which has a z-index of 1002)
  const maskProps = useMemo(
    () => ({ style: `z-index: ${(euiTheme.levels.flyout as number) + 3}` }),
    [euiTheme.levels.flyout]
  );

  return (
    <EuiPortal>
      <EuiFlyout
        size="m"
        ownFocus
        onClose={onClose}
        aria-labelledby="flyoutTitle"
        // EUI TODO: This z-index override of EuiOverlayMask is a workaround, and ideally should be resolved with a cleaner UI/UX flow long-term
        maskProps={maskProps}
      >
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="s">
            <h2 id="flyoutTitle">
              <FormattedMessage
                id="xpack.osquery.liveQueryActions.details.title"
                defaultMessage="Query Details"
              />
            </h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <EuiFlexItem grow={false}>
            <strong>
              <FormattedMessage
                id="xpack.osquery.liveQueryActions.details.id"
                defaultMessage="Id"
              />
            </strong>
            <EuiSpacer size="xs" />
            <EuiCodeBlock fontSize="m" paddingSize="s" isCopyable={true}>
              {action.id}
            </EuiCodeBlock>
          </EuiFlexItem>
          <EuiSpacer size="m" />
          <EuiFlexItem grow={false}>
            <strong>
              <FormattedMessage
                id="xpack.osquery.liveQueryActions.details.query"
                defaultMessage="Query"
              />
            </strong>
            <EuiSpacer size="xs" />
            <EuiCodeBlock language="sql" fontSize="m" paddingSize="s" isCopyable={true}>
              {action.query}
            </EuiCodeBlock>
          </EuiFlexItem>
          <EuiSpacer size="m" />
        </EuiFlyoutBody>
      </EuiFlyout>
    </EuiPortal>
  );
};

export const QueryDetailsFlyout = React.memo(QueryDetailsFlyoutComponent);
