/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiImage, EuiPanel, EuiText, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { CreateAiIndexButton } from '../create_ai_index_button';
import onboardingIllustration from './assets/ai_index_onboarding.png';

const ILLUSTRATION_SIZE_PX = 170;

export const AiIndexOnboardingPanel = () => (
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
                  defaultMessage="An AI Index turns your data into knowledge your agents can retrieve. Connect your sources once, and automations keep that knowledge fresh, so agents answer from curated knowledge instead of scanning raw data."
                />
              </p>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <CreateAiIndexButton />
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
