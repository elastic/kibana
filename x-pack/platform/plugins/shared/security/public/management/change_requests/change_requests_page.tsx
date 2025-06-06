/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiPageHeader, EuiSpacer, EuiTitle } from '@elastic/eui';
import React from 'react';

import { FormattedMessage } from '@kbn/i18n-react';

import { MyRequestsTable } from './my_requests_table';
import { ReviewTable } from './review_table';

export const ChangeRequestsPage = () => {
  const canManage = true;

  return (
    <>
      <EuiPageHeader
        pageTitle={
          <FormattedMessage
            id="xpack.security.management.changeRequests.changeRequestsTitle"
            defaultMessage="Change requests"
          />
        }
        bottomBorder
      />

      <EuiSpacer size="l" />

      <EuiFlexGroup gutterSize="l" direction="column">
        {canManage && (
          <EuiFlexItem>
            <EuiTitle size="s">
              <h2>To review</h2>
            </EuiTitle>
            <EuiSpacer size="m" />
            <ReviewTable />
          </EuiFlexItem>
        )}
        <EuiFlexItem>
          <EuiTitle size="s">
            <h2>My requests</h2>
          </EuiTitle>
          <EuiSpacer size="m" />
          <MyRequestsTable />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
