/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiPanel, EuiSpacer, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { isEmpty } from 'lodash';
import React, { useEffect, useState } from 'react';
import { CustomLink } from '../../../../../../../../../plugins/apm/server/lib/settings/custom_link/custom_link_types';
import { useFetcher, FETCH_STATUS } from '../../../../../hooks/useFetcher';
import { CustomLinkFlyout } from './CustomLinkFlyout';
import { CustomLinkTable } from './CustomLinkTable';
import { EmptyPrompt } from './EmptyPrompt';
import { Title } from './Title';
import { CreateCustomLinkButton } from './CreateCustomLinkButton';

export const CustomLinkOverview = () => {
  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);
  const [customLinkSelected, setCustomLinkSelected] = useState<
    CustomLink | undefined
  >();

  const { data: customLinks, status, refetch } = useFetcher(
    callApmApi => callApmApi({ pathname: '/api/apm/settings/custom-links' }),
    []
  );

  useEffect(() => {
    if (customLinkSelected) {
      setIsFlyoutOpen(true);
    }
  }, [customLinkSelected]);

  const onCloseFlyout = () => {
    setCustomLinkSelected(undefined);
    setIsFlyoutOpen(false);
  };

  const onCreateCustomLinkClick = () => {
    setIsFlyoutOpen(true);
  };

  const showEmptyPrompt =
    status === FETCH_STATUS.SUCCESS && isEmpty(customLinks);

  return (
    <>
      {isFlyoutOpen && (
        <CustomLinkFlyout
          onClose={onCloseFlyout}
          customLinkSelected={customLinkSelected}
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
          {!showEmptyPrompt && (
            <EuiFlexItem>
              <EuiFlexGroup alignItems="center" justifyContent="flexEnd">
                <EuiFlexItem grow={false}>
                  <CreateCustomLinkButton onClick={onCreateCustomLinkClick} />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>

        <EuiSpacer size="m" />

        {showEmptyPrompt ? (
          <EmptyPrompt onCreateCustomLinkClick={onCreateCustomLinkClick} />
        ) : (
          <CustomLinkTable
            items={customLinks}
            onCustomLinkSelected={setCustomLinkSelected}
          />
        )}
      </EuiPanel>
    </>
  );
};
