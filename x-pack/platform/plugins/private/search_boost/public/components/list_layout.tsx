/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { ContentList } from '@kbn/content-list';

interface ListLayoutProps {
  toolbar: ReactNode;
  /** Controls beside the toolbar, such as a create button. */
  toolbarAppend?: ReactNode;
  emptyState: ReactNode;
  'data-test-subj'?: string;
  children: ReactNode;
}

// The toolbar stays outside `ContentList`, which shows only `emptyState` when the list is empty.
export const ListLayout = ({
  toolbar,
  toolbarAppend,
  emptyState,
  'data-test-subj': dataTestSubj,
  children,
}: ListLayoutProps) => (
  <>
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
      <EuiFlexItem>{toolbar}</EuiFlexItem>
      {toolbarAppend && <EuiFlexItem grow={false}>{toolbarAppend}</EuiFlexItem>}
    </EuiFlexGroup>
    <EuiSpacer size="m" />
    <ContentList emptyState={emptyState} data-test-subj={dataTestSubj}>
      {children}
    </ContentList>
  </>
);
