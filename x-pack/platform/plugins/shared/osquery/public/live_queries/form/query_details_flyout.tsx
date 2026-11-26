/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiCodeBlock,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiPortal,
  EuiSpacer,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

// Session behaviour is decided by the caller, which knows whether it is rendered inside a
// managed (session) flyout: nested joins that session at size s, standalone stays at size m.
export type QueryDetailsFlyoutSessionProps =
  | { session: 'inherit'; size: 's' }
  | { session: 'never'; size: 'm' };

const STANDALONE_FLYOUT_PROPS: QueryDetailsFlyoutSessionProps = { session: 'never', size: 'm' };

interface QueryDetailsFlyoutProps {
  action: {
    id: string;
    query: string;
  };
  onClose: () => void;
  flyoutProps?: QueryDetailsFlyoutSessionProps;
}

const QUERY_DETAILS_TITLE = i18n.translate('xpack.osquery.liveQueryActions.details.title', {
  defaultMessage: 'Query Details',
});

const QueryDetailsFlyoutComponent: React.FC<QueryDetailsFlyoutProps> = ({
  action,
  onClose,
  flyoutProps = STANDALONE_FLYOUT_PROPS,
}) => {
  const titleId = useGeneratedHtmlId({ prefix: 'osqueryQueryDetailsFlyoutTitle' });

  return (
    <EuiPortal>
      <EuiFlyout
        data-test-subj="osquery-query-details-flyout"
        {...flyoutProps}
        aria-labelledby={titleId}
        ownFocus
        onClose={onClose}
      >
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="s">
            <h2 id={titleId}>{QUERY_DETAILS_TITLE}</h2>
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
