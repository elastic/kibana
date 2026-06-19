/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useCurrentEuiBreakpoint,
  useEuiTheme,
} from '@elastic/eui';
import { WHY_V2_SPOTLIGHTS } from '../../content/why_v2_features';
import { WhyV2SpotlightIllustration } from './why_v2_illustrations';
import { SPOTLIGHT_DETAIL_BY_ID } from './why_v2_spotlight_content';
import { whyV2PageStyles } from './why_v2_page.styles';

export const WhyV2Spotlights = () => {
  const theme = useEuiTheme();
  const breakpoint = useCurrentEuiBreakpoint();
  const stackIllustration = breakpoint === 's' || breakpoint === 'xs';

  return (
    <section data-test-subj="whyV2Spotlights">
      {WHY_V2_SPOTLIGHTS.map((spotlight) => {
        const illustrationFirst = spotlight.reversed && !stackIllustration;

        const textBlock = (
          <EuiFlexItem grow={stackIllustration ? false : true}>
            <p css={whyV2PageStyles.sectionLabel(theme)}>{spotlight.label}</p>
            <EuiTitle size="m">
              <h2>{spotlight.headline}</h2>
            </EuiTitle>
            <EuiSpacer size="m" />
            <EuiText size="s" color="subdued">
              {SPOTLIGHT_DETAIL_BY_ID[spotlight.id]}
            </EuiText>
          </EuiFlexItem>
        );

        const illustrationBlock = (
          <EuiFlexItem grow={false}>
            <div css={whyV2PageStyles.spotlightIllustration(theme)}>
              <WhyV2SpotlightIllustration
                type={spotlight.illustration}
                dataTestSubj={`whyV2SpotlightIllustration-${spotlight.id}`}
              />
            </div>
          </EuiFlexItem>
        );

        return (
          <article
            key={spotlight.id}
            css={whyV2PageStyles.spotlightSection()}
            data-test-subj={`whyV2Spotlight-${spotlight.id}`}
          >
            <EuiFlexGroup
              alignItems="center"
              gutterSize="xl"
              direction={stackIllustration ? 'column' : 'row'}
              responsive={false}
              css={stackIllustration ? undefined : whyV2PageStyles.spotlightRow()}
            >
              {illustrationFirst ? illustrationBlock : textBlock}
              {illustrationFirst ? textBlock : illustrationBlock}
            </EuiFlexGroup>
          </article>
        );
      })}
    </section>
  );
};
