/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React from 'react';
import { useHistory } from 'react-router-dom';
import { parsePath } from 'history';
import {
  EuiTabbedContent,
  EuiTabbedContentTab,
  EuiSpacer,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPage,
  EuiPageHeader,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentBody,
} from '@elastic/eui';

import { TestImageA } from '../components';
import { useApplicationContext } from '../application_context';
import { MyForwardableState } from '../types';
import { ROUTES } from '../constants';

import './capture_test.scss';

const ItemsContainer: FunctionComponent<{ count: string }> = ({ count, children }) => (
  <div
    className="reportingExample__captureContainer"
    data-shared-items-container
    data-shared-items-count={count}
  >
    {children}
  </div>
);

const tabs: Array<EuiTabbedContentTab & { id: MyForwardableState['captureTest'] }> = [
  {
    id: 'A',
    name: 'Test A',
    content: (
      <ItemsContainer count="4">
        <TestImageA />
        <TestImageA />
        <TestImageA />
        <TestImageA />
      </ItemsContainer>
    ),
  },
];

export const CaptureTest: FunctionComponent = () => {
  const { forwardedState } = useApplicationContext();
  const tabToRender = forwardedState?.captureTest;
  const history = useHistory();
  return (
    <EuiPage>
      <EuiPageBody>
        <EuiPageContent>
          <EuiPageHeader>
            <EuiFlexGroup alignItems="center" justifyContent="flexEnd">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  iconType="arrowLeft"
                  href={history.createHref(parsePath(ROUTES.main))}
                >
                  Back to main
                </EuiButtonEmpty>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPageHeader>
          <EuiPageContentBody>
            <EuiSpacer />
            <EuiTabbedContent
              tabs={tabs}
              initialSelectedTab={
                tabToRender ? tabs.find((tab) => tab.id === tabToRender) : undefined
              }
            />
          </EuiPageContentBody>
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
};
