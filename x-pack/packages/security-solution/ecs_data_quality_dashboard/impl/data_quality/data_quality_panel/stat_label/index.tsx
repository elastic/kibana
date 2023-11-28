/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import styled from 'styled-components';

const Line1 = styled.span`
  display: block;
`;

const Line2 = styled.span`
  display: inline-block;
`;

const EMPTY = ' ';

interface Props {
  color?: string;
  line1?: string;
  line2?: string;
}

export const StatLabel: React.FC<Props> = ({ color, line1 = EMPTY, line2 = EMPTY }) => (
  <>
    <Line1 data-test-subj="line1">{line1}</Line1>
    <Line2 data-test-subj="line2">{line2}</Line2>
  </>
);
