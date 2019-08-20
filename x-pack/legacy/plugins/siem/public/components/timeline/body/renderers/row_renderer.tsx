/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext } from 'react';
import { BrowserFields } from '../../../../containers/source';
import { Ecs } from '../../../../graphql/types';
import { TimelineWidthContext } from '../../timeline_context';

interface RowRendererContainerProps {
  children: React.ReactNode;
}

export const RowRendererContainer = React.memo<RowRendererContainerProps>(({ children }) => {
  const width = useContext(TimelineWidthContext);
  return <div style={{ width: `${width}px` }}>{children}</div>;
});

RowRendererContainer.displayName = 'RowRendererContainer';

export interface RowRenderer {
  isInstance: (data: Ecs) => boolean;
  renderRow: ({
    browserFields,
    data,
    children,
  }: {
    browserFields: BrowserFields;
    data: Ecs;
    children: React.ReactNode;
  }) => React.ReactNode;
}
