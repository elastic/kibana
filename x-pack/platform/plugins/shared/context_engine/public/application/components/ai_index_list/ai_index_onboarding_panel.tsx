/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  COLOR_MODES_STANDARD,
  EuiFlexGroup,
  EuiFlexItem,
  EuiImage,
  EuiLink,
  EuiPanel,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { getEbtProps } from '@kbn/ebt-click';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { CONTEXT_ENGINE_UI_EBT } from '../../../../common/telemetry';
import { useKibana } from '../../hooks/use_kibana';
import { CreateAiIndexButton } from '../create_ai_index_button';
import onboardingIllustrationDark from './assets/ai_index_onboarding_dark.svg';
import onboardingIllustrationLight from './assets/ai_index_onboarding_light.svg';

const ILLUSTRATION_SIZE_PX = 236;

export const AiIndexOnboardingPanel = () => {
  const { colorMode } = useEuiTheme();
  const {
    services: { docLinks },
  } = useKibana();
  const onboardingIllustration =
    colorMode === COLOR_MODES_STANDARD.dark
      ? onboardingIllustrationDark
      : onboardingIllustrationLight;

  return (
    <EuiPanel hasBorder paddingSize="l" data-test-subj="contextAiIndexOnboarding">
      <EuiFlexGroup alignItems="center" gutterSize="xl" responsive wrap>
        <EuiFlexItem>
          <EuiFlexGroup direction="column" gutterSize="m" alignItems="flexStart">
            <EuiFlexItem grow={false}>
              <EuiTitle size="s">
                <h2>
                  <FormattedMessage
                    id="xpack.contextEngine.landing.onboarding.title"
                    defaultMessage="Get started with Context"
                  />
                </h2>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="m" color="subdued">
                <p>
                  <FormattedMessage
                    id="xpack.contextEngine.landing.onboarding.body"
                    defaultMessage="An AI Index stores precomputed, curated context derived from your source data. Agents retrieve this focused context instead of repeatedly scanning raw data, saving time and tokens. Add sources and Workflow automations to build and refresh the index."
                  />
                </p>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false} wrap>
                <EuiFlexItem grow={false}>
                  <CreateAiIndexButton />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiLink
                    href={docLinks.links.contextEngine.buildAndMaintainAiIndex}
                    external
                    data-test-subj="contextAiIndexOnboardingLearnMoreLink"
                    {...getEbtProps({
                      element: CONTEXT_ENGINE_UI_EBT.element.aiIndexListPage,
                      action: CONTEXT_ENGINE_UI_EBT.action.navigation.LEARN_MORE_DOCS,
                    })}
                  >
                    <FormattedMessage
                      id="xpack.contextEngine.landing.onboarding.learnWhatIsAiIndex"
                      defaultMessage="Learn what an AI index is"
                    />
                  </EuiLink>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiImage
            size={ILLUSTRATION_SIZE_PX}
            src={onboardingIllustration}
            alt=""
            data-test-subj="contextAiIndexOnboardingIllustration"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
