/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiPage, EuiPageSideBar, EuiPageBody } from '@elastic/eui';
import { RootDragDropProvider } from '../../drag_drop';

export interface FrameLayoutProps {
  dataPanel: React.ReactNode;
  configPanel?: React.ReactNode;
  suggestionsPanel?: React.ReactNode;
  workspacePanel?: React.ReactNode;
}

export function FrameLayout(props: FrameLayoutProps) {
  return (
    <RootDragDropProvider>
      <EuiPage className="lnsPage">
        <div className="lnsPageMainContent">
          <EuiPageSideBar className="lnsSidebar">{props.dataPanel}</EuiPageSideBar>
          <EuiPageBody className="lnsPageBody" restrictWidth={false}>
            {props.workspacePanel}
            {props.suggestionsPanel}
          </EuiPageBody>
          <EuiPageSideBar className="lnsSidebar lnsSidebar--right">
            {props.configPanel}
          </EuiPageSideBar>
        </div>
      </EuiPage>
    </RootDragDropProvider>
  );
}
