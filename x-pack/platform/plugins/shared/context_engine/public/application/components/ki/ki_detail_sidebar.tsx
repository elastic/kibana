/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiDescriptionListProps } from '@elastic/eui';
import { EuiDescriptionList, EuiTextBlockTruncate, EuiTitle } from '@elastic/eui';
import React from 'react';

export const KI_DETAIL_SIDEBAR_VALUE_MAX_LINES = 3;

export const KiDetailSidebarSectionTitle = ({ children }: { children: React.ReactNode }) => (
  <EuiTitle size="xs">
    <h3>{children}</h3>
  </EuiTitle>
);

interface KiDetailSidebarDescriptionListProps {
  listItems: EuiDescriptionListProps['listItems'];
  'data-test-subj'?: string;
}

export const KiDetailSidebarDescriptionList = ({
  listItems,
  'data-test-subj': dataTestSubj,
}: KiDetailSidebarDescriptionListProps) => (
  <EuiDescriptionList
    type="row"
    textStyle="normal"
    compressed
    rowGutterSize="m"
    listItems={listItems}
    data-test-subj={dataTestSubj}
  />
);

interface KiDetailSidebarBreakableTextProps {
  children: React.ReactNode;
  title?: string;
}

export const KiDetailSidebarBreakableText = ({
  children,
  title,
}: KiDetailSidebarBreakableTextProps) => {
  const tooltipTitle = title ?? (typeof children === 'string' ? children : undefined);

  return (
    <EuiTextBlockTruncate
      lines={KI_DETAIL_SIDEBAR_VALUE_MAX_LINES}
      className="eui-textBreakWord"
      title={tooltipTitle}
    >
      {children}
    </EuiTextBlockTruncate>
  );
};
