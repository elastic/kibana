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
  useHasActiveSession,
  useIsInsideParentFlyout,
} from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

interface QueryDetailsFlyoutProps {
  action: {
    id: string;
    query: string;
  };
  onClose: () => void;
}

const QUERY_DETAILS_TITLE = i18n.translate('xpack.osquery.liveQueryActions.details.title', {
  defaultMessage: 'Query Details',
});

const QueryDetailsFlyoutComponent: React.FC<QueryDetailsFlyoutProps> = ({ action, onClose }) => {
  const titleId = useGeneratedHtmlId({ prefix: 'osqueryQueryDetailsFlyoutTitle' });
  const isInsideParentFlyout = useIsInsideParentFlyout();
  const hasActiveSession = useHasActiveSession();
  const isNested = isInsideParentFlyout && hasActiveSession;

  return (
    <EuiPortal>
      <EuiFlyout
        data-test-subj="osquery-query-details-flyout"
        {...(isNested
          ? { session: 'inherit' as const, size: 's' as const, 'aria-label': QUERY_DETAILS_TITLE }
          : {
              session: 'never' as const,
              size: 'm' as const,
              'aria-labelledby': titleId,
            })}
        ownFocus
        onClose={onClose}
      >
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="s">
            <h2 id={titleId}>
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
