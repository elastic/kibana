/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiResizableContainer } from '@elastic/eui';
import { css } from '@emotion/css';
import React from 'react';
import { ChildStreamList } from './child_stream_list';
import { PreviewPanel } from './preview_panel';
import { QueryStreamCreationProvider } from './query_stream_creation_context';

interface PartitioningLayoutProps {
  availableStreams?: string[];
  children?: React.ReactNode;
}

const overflowAutoClass = css`
  overflow: auto;
`;

const panelClass = css`
  display: flex;
  max-width: 100%;
  overflow: auto;
  flex-grow: 1;
`;

const leftPanelClass = css`
  overflow: auto;
  display: flex;
`;

const rightPanelClass = css`
  display: flex;
  flex-direction: column;
`;

export const PartitioningLayout = ({ availableStreams, children }: PartitioningLayoutProps) => {
  return (
    <EuiFlexItem className={overflowAutoClass} grow>
      <EuiFlexGroup direction="column" gutterSize="s" className={overflowAutoClass}>
        <QueryStreamCreationProvider>
          <EuiPanel hasShadow={false} className={panelClass} paddingSize="none">
            <EuiResizableContainer>
              {(EuiResizablePanel, EuiResizableButton) => (
                <>
                  <EuiResizablePanel
                    initialSize={40}
                    minSize="400px"
                    tabIndex={0}
                    paddingSize="l"
                    className={leftPanelClass}
                  >
                    <ChildStreamList availableStreams={availableStreams} />
                  </EuiResizablePanel>

                  <EuiResizableButton indicator="border" />

                  <EuiResizablePanel
                    initialSize={60}
                    tabIndex={0}
                    minSize="300px"
                    paddingSize="l"
                    className={rightPanelClass}
                  >
                    <PreviewPanel />
                  </EuiResizablePanel>
                </>
              )}
            </EuiResizableContainer>
          </EuiPanel>
        </QueryStreamCreationProvider>
        {children}
      </EuiFlexGroup>
    </EuiFlexItem>
  );
};
