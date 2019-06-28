/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiPage, EuiPageSideBar, EuiPageBody, EuiPageHeader } from '@elastic/eui';
import { RootDragDropProvider } from '../../drag_drop';

export interface FrameLayoutProps {
  dataPanel: React.ReactNode;
  configPanel?: React.ReactNode;
  suggestionsPanel?: React.ReactNode;
  workspacePanel?: React.ReactNode;
  navPanel?: React.ReactNode;
}

export function FrameLayout(props: FrameLayoutProps) {
  return (
    <RootDragDropProvider>
      <EuiPage className="lnsPage">
        <EuiPageHeader className="lnsHeader">{props.navPanel}</EuiPageHeader>
        <EuiPageSideBar className="lnsSidebar">{props.dataPanel}</EuiPageSideBar>
        <EuiPageBody className="lnsPageBody" restrictWidth={false}>
          {props.workspacePanel}
        </EuiPageBody>
        <EuiPageSideBar className="lnsSidebar lnsSidebar--right">
          {props.configPanel}
          {props.suggestionsPanel}
        </EuiPageSideBar>
      </EuiPage>
    </RootDragDropProvider>
  );
}
