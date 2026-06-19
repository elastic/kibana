/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSpacer,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { WHY_V2_HIGHLIGHTS } from '../../content/why_v2_features';
import { WhyV2Comparison } from './why_v2_comparison';
import { whyV2PageStyles } from './why_v2_page.styles';

export const WhyV2Highlights = () => {
  const theme = useEuiTheme();

  return (
    <section data-test-subj="whyV2Highlights">
      <EuiFlexGrid columns={3} responsive>
        {WHY_V2_HIGHLIGHTS.map((item) => (
          <EuiFlexItem key={item.id}>
            <div css={whyV2PageStyles.highlightCard(theme)} data-test-subj={`whyV2Highlight-${item.id}`}>
              <EuiFlexGroup gutterSize="m" alignItems="flexStart" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiIcon type={item.icon} size="l" color="primary" />
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiText size="s">
                    <p>{item.headline}</p>
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </div>
          </EuiFlexItem>
        ))}
      </EuiFlexGrid>
      <EuiSpacer size="m" />
      <WhyV2Comparison />
    </section>
  );
};
