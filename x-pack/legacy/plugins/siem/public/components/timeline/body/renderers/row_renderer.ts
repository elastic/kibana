/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import styled from 'styled-components';

import { BrowserFields } from '../../../../containers/source';
import { Ecs } from '../../../../graphql/types';

export const RowRendererContainer = styled.div<{ width: number }>`
  width: ${({ width }) => `${width}px`};
`;

export interface RowRenderer {
  isInstance: (data: Ecs) => boolean;
  renderRow: (
    {
      browserFields,
      data,
      width,
      children,
    }: { browserFields: BrowserFields; data: Ecs; width: number; children: React.ReactNode }
  ) => React.ReactNode;
}
