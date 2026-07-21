/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiLink,
  EuiPanel,
  EuiSkeletonRectangle,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import React from 'react';
import { useNavigation } from '../hooks/use_navigation';
import { getAiIndexDetailPath } from '../paths';

const SOURCE_PLACEHOLDER_COUNT = 2;

export const CreateAiIndexPage = () => {
  const { createContextEngineUrl } = useNavigation();

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
          <EuiSpacer size="l" />
          {Array.from({ length: SOURCE_PLACEHOLDER_COUNT }).map((_, index) => (
            <React.Fragment key={index}>
              <EuiSkeletonRectangle
                width="100%"
                height={56}
                borderRadius="m"
                data-test-subj="contextCreateAiIndexSourcePlaceholder"
              />
              <EuiSpacer size="s" />
            </React.Fragment>
          ))}
          <EuiSpacer size="s" />
          <EuiLink
            data-test-subj="contextCreateAiIndexContinueLink"
            href={createContextEngineUrl(getAiIndexDetailPath('new'))}
          >
            {i18n.translate('xpack.contextEngine.createAiIndex.continueLink', {
              defaultMessage: 'Continue to AI index',
            })}
          </EuiLink>
        </EuiPanel>
      </KibanaPageTemplate.Section>
    </KibanaPageTemplate>
  );
};
