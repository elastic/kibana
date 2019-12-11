/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEmpty } from 'lodash';
import React from 'react';
import styled from 'styled-components';
import { px } from '../../../../../style/variables';
import { AgentMarker } from './AgentMarker';
import { ErrorMarker } from './ErrorMarker';

interface Props {
  mark: any; // TODO: Can be AgentMark or ErrorMark
  x: number;
}

const MarkerContainer = styled.div`
  position: absolute;
  bottom: 0;
`;

export const Marker: React.FC<Props> = ({ mark, x }) => {
  if (isEmpty(mark)) {
    return null;
  }
  const legendWidth = 11;
  return (
    <MarkerContainer style={{ left: px(x - legendWidth / 2) }}>
      {mark.type === 'AGENT' ? (
        <AgentMarker mark={mark} />
      ) : (
        <ErrorMarker mark={mark} />
      )}
    </MarkerContainer>
  );
};
