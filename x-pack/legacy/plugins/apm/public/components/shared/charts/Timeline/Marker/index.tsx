/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import styled from 'styled-components';
import { px } from '../../../../../style/variables';
import { AgentMarker } from './AgentMarker';
import { ErrorMarker } from './ErrorMarker';
import {
  IWaterfallItemError,
  IWaterfallItemAgentMark
} from '../../../../app/TransactionDetails/WaterfallWithSummmary/WaterfallContainer/Waterfall/waterfall_helpers/waterfall_helpers';

interface Props {
  mark: IWaterfallItemError | IWaterfallItemAgentMark;
  x: number;
}

const MarkerContainer = styled.div`
  position: absolute;
  bottom: 0;
`;

export const Marker: React.FC<Props> = ({ mark, x }) => (
  <MarkerContainer style={{ left: px(x) }}>
    {mark.docType === 'agentMark' ? (
      <AgentMarker mark={mark} />
    ) : (
      <ErrorMarker mark={mark} />
    )}
  </MarkerContainer>
);
