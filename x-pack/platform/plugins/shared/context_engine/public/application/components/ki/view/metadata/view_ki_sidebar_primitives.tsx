/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiDescriptionListProps } from '@elastic/eui';
import { EuiDescriptionList, EuiTextBlockTruncate, EuiTitle } from '@elastic/eui';
import React from 'react';

export const VIEW_KI_SIDEBAR_VALUE_MAX_LINES = 3;

export const ViewKiSidebarSectionTitle = ({ children }: { children: React.ReactNode }) => (
  <EuiTitle size="xs">
    <h3>{children}</h3>
  </EuiTitle>
);

interface ViewKiSidebarDescriptionListProps {
  listItems: EuiDescriptionListProps['listItems'];
  'data-test-subj'?: string;
}

export const ViewKiSidebarDescriptionList = ({
  listItems,
  'data-test-subj': dataTestSubj,
}: ViewKiSidebarDescriptionListProps) => (
  <EuiDescriptionList
    type="row"
    textStyle="normal"
    compressed
    rowGutterSize="m"
    listItems={listItems}
    data-test-subj={dataTestSubj}
  />
);

interface ViewKiSidebarBreakableTextProps {
  children: React.ReactNode;
  title?: string;
}

export const ViewKiSidebarBreakableText = ({
  children,
  title,
}: ViewKiSidebarBreakableTextProps) => {
  const tooltipTitle = title ?? (typeof children === 'string' ? children : undefined);

  return (
    <EuiTextBlockTruncate
      lines={VIEW_KI_SIDEBAR_VALUE_MAX_LINES}
      className="eui-textBreakWord"
      title={tooltipTitle}
    >
      {children}
    </EuiTextBlockTruncate>
  );
};
