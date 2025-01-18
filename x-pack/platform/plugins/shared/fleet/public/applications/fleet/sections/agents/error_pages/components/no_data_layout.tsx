/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt, EuiFlexGroup, EuiFlexItem, EuiPageSection } from '@elastic/eui';
import React from 'react';
import { withRouter } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
  title: string | React.ReactNode;
  actionSection?: React.ReactNode;
}

export const NoDataLayout: React.FunctionComponent<LayoutProps> = withRouter<
  any,
  React.FunctionComponent<LayoutProps>
>(({ actionSection, title, children }: React.PropsWithChildren<LayoutProps>) => {
  return (
    <EuiFlexGroup justifyContent="spaceAround">
      <EuiFlexItem grow={false}>
        <EuiPageSection color="transparent">
          <EuiEmptyPrompt
            color="plain"
            iconType="logoBeats"
            title={<h2>{title}</h2>}
            body={children}
            actions={actionSection}
          />
        </EuiPageSection>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}) as any;
