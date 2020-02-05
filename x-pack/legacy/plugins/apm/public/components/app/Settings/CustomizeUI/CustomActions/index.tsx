/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiPanel, EuiSpacer } from '@elastic/eui';
import { isEmpty } from 'lodash';
import React, { useState } from 'react';
import { ManagedTable } from '../../../../shared/ManagedTable';
import { Title } from './Title';
import { EmptyPrompt } from './EmptyPrompt';
import { Flyout } from './Flyout';

export const CustomActions = () => {
  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);

  // TODO: change it to correct fields fetched from ES
  const columns = [
    {
      field: 'actionName',
      name: 'Action Name',
      truncateText: true
    },
    {
      field: 'serviceName',
      name: 'Service Name'
    },
    {
      field: 'environment',
      name: 'Environment'
    },
    {
      field: 'lastUpdate',
      name: 'Last update'
    },
    {
      field: 'actions',
      name: 'Actions'
    }
  ];

  // TODO: change to items fetched from ES.
  const items: object[] = [];

  const onCloseFlyout = () => {
    setIsFlyoutOpen(false);
  };

  return (
    <>
      <EuiPanel>
        <Title />
        <EuiSpacer size="m" />
        {isFlyoutOpen && <Flyout onClose={onCloseFlyout} />}
        {isEmpty(items) ? (
          <EmptyPrompt setIsFlyoutOpen={setIsFlyoutOpen} />
        ) : (
          <ManagedTable
            items={items}
            columns={columns}
            initialPageSize={25}
            initialSortField="occurrenceCount"
            initialSortDirection="desc"
            sortItems={false}
          />
        )}
      </EuiPanel>
    </>
  );
};
