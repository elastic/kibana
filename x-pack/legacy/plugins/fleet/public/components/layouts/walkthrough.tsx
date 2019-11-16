/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import {
  EuiPageContent,
  EuiPageContentBody,
  // @ts-ignore
  EuiStepsHorizontal,
  EuiTitle,
} from '@elastic/eui';

interface LayoutProps {
  title: string;
  goTo: (path: string) => any;
  walkthroughSteps: Array<{
    id: string;
    name: string;
  }>;
  activePath: string;
}

export const WalkthroughLayout: React.SFC<LayoutProps> = ({
  walkthroughSteps,
  title,
  activePath,
  goTo,
  children,
}) => {
  const indexOfCurrent = walkthroughSteps.findIndex(step => activePath === step.id);
  return (
    <EuiPageContent>
      <EuiTitle>
        <h1 style={{ textAlign: 'center' }}>{title}</h1>
      </EuiTitle>
      <br />
      <br />
      <EuiStepsHorizontal
        steps={walkthroughSteps.map((step, i) => ({
          title: step.name,
          isComplete: i <= indexOfCurrent,
          onClick: () => goTo(step.id),
        }))}
      />
      <br />
      <br />
      <EuiPageContentBody>{children}</EuiPageContentBody>
    </EuiPageContent>
  );
};
