/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiPanel, EuiSpacer, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { isEmpty } from 'lodash';
import React, { useEffect, useState } from 'react';
import { CustomAction } from '../../../../../../../../../plugins/apm/server/lib/settings/custom_action/custom_action_types';
import { useFetcher } from '../../../../../hooks/useFetcher';
import { CustomActionsFlyout } from './CustomActionsFlyout';
import { CustomActionsTable } from './CustomActionsTable';
import { EmptyPrompt } from './EmptyPrompt';
import { Title } from './Title';
import { CreateCustomActionButton } from './CreateCustomActionButton';

export const CustomActionsOverview = () => {
  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);
  const [customActionSelected, setCustomActionSelected] = useState<
    CustomAction | undefined
  >();

  const { data: customActions, refetch } = useFetcher(
    callApmApi => callApmApi({ pathname: '/api/apm/settings/custom-actions' }),
    []
  );

  useEffect(() => {
    if (customActionSelected) {
      setIsFlyoutOpen(true);
    }
  }, [customActionSelected]);

  const onCloseFlyout = () => {
    setCustomActionSelected(undefined);
    setIsFlyoutOpen(false);
  };

  const onCreateCustomActionClick = () => {
    setIsFlyoutOpen(true);
  };

  const hasCustomActions = !isEmpty(customActions);

  return (
    <>
      {isFlyoutOpen && (
        <CustomActionsFlyout
          onClose={onCloseFlyout}
          customActionSelected={customActionSelected}
          onSave={() => {
            onCloseFlyout();
            refetch();
          }}
          onDelete={() => {
            onCloseFlyout();
            refetch();
          }}
        />
      )}
      <EuiPanel>
        <EuiFlexGroup alignItems="center">
          <EuiFlexItem grow={false}>
            <Title />
          </EuiFlexItem>
          {hasCustomActions && (
            <EuiFlexItem>
              <EuiFlexGroup alignItems="center" justifyContent="flexEnd">
                <EuiFlexItem grow={false}>
                  <CreateCustomActionButton
                    onClick={onCreateCustomActionClick}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>

        <EuiSpacer size="m" />

        {hasCustomActions ? (
          <CustomActionsTable
            items={customActions}
            onCustomActionSelected={setCustomActionSelected}
          />
        ) : (
          <EmptyPrompt onCreateCustomActionClick={onCreateCustomActionClick} />
        )}
      </EuiPanel>
    </>
  );
};
