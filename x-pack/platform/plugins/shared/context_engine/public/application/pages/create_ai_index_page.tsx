/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import React, { useState } from 'react';
import { SourcePicker } from '../components/source_picker';
import type { SelectedSource } from '../components/source_picker';
import { useNavigation } from '../hooks/use_navigation';
import { getAiIndexDetailPath } from '../paths';

export const CreateAiIndexPage = () => {
  const { navigateToContextEngine } = useNavigation();
  const [selectedSources, setSelectedSources] = useState<SelectedSource[]>([]);

  const goToAiIndex = () => navigateToContextEngine(getAiIndexDetailPath('new'));

  return (
    <KibanaPageTemplate data-test-subj="contextCreateAiIndexPage">
      <KibanaPageTemplate.Header
        pageTitle={i18n.translate('xpack.contextEngine.createAiIndex.title', {
          defaultMessage: 'Create AI index',
        })}
        description={i18n.translate('xpack.contextEngine.createAiIndex.description', {
          defaultMessage:
            'Start by picking a source to build context from or skip and add sources later.',
        })}
      />
      <KibanaPageTemplate.Section>
        <EuiPanel hasBorder paddingSize="l">
          <EuiFlexGroup alignItems="flexStart" gutterSize="m">
            <EuiFlexItem>
              <EuiTitle size="s">
                <h2>
                  {i18n.translate('xpack.contextEngine.createAiIndex.addSource.title', {
                    defaultMessage: 'Add a source',
                  })}
                </h2>
              </EuiTitle>
              <EuiSpacer size="s" />
              <EuiText size="s" color="subdued">
                <p>
                  {i18n.translate('xpack.contextEngine.createAiIndex.addSource.description', {
                    defaultMessage:
                      'Pick what this AI index should build context from. You can add more than one.',
                  })}
                </p>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty data-test-subj="contextSkipSourcesButton" onClick={goToAiIndex}>
                    {i18n.translate('xpack.contextEngine.createAiIndex.skipButton', {
                      defaultMessage: 'Skip for now',
                    })}
                  </EuiButtonEmpty>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButton
                    fill
                    iconType="arrowRight"
                    iconSide="right"
                    data-test-subj="contextContinueButton"
                    onClick={goToAiIndex}
                  >
                    {i18n.translate('xpack.contextEngine.createAiIndex.continueButton', {
                      defaultMessage: 'Continue',
                    })}
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="l" />
          <SourcePicker selectedSources={selectedSources} onChange={setSelectedSources} />
        </EuiPanel>
      </KibanaPageTemplate.Section>
    </KibanaPageTemplate>
  );
};
