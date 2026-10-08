/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiIllustration,
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type { UseEuiTheme } from '@elastic/eui';
import { genai } from '@elastic/eui-illustrations';
import { i18n } from '@kbn/i18n';
import { docLinks } from '../../../common/doc_links';

const illustrationStyles = ({ euiTheme }: UseEuiTheme) => ({
  maxInlineSize: euiTheme.base * 8,
  marginInline: 'auto',
});

interface EisSelfManagedEmptyPromptProps {
  onConnectCluster: () => void;
}

export const EisSelfManagedEmptyPrompt = ({ onConnectCluster }: EisSelfManagedEmptyPromptProps) => (
  <EuiEmptyPrompt
    layout="horizontal"
    color="plain"
    data-test-subj="eisSelfManagedEmptyPrompt"
    icon={<EuiIllustration type={genai} alt="" css={illustrationStyles} />}
    title={
      <h2>
        {i18n.translate('xpack.searchInferenceEndpoints.eisModelsPage.selfManagedEmpty.title', {
          defaultMessage: 'Elastic Inference Service',
        })}
      </h2>
    }
    body={
      <EuiText size="s">
        <p>
          {i18n.translate(
            'xpack.searchInferenceEndpoints.eisModelsPage.selfManagedEmpty.description',
            {
              defaultMessage:
                'Use AI-powered search, ingest, and chat without managing infrastructure or resources.',
            }
          )}
        </p>
        <EuiFlexGroup direction="column" gutterSize="s" responsive={false}>
          {[
            i18n.translate(
              'xpack.searchInferenceEndpoints.eisModelsPage.selfManagedEmpty.jinaModels',
              { defaultMessage: 'Access the latest Jina models' }
            ),
            i18n.translate(
              'xpack.searchInferenceEndpoints.eisModelsPage.selfManagedEmpty.topProviders',
              { defaultMessage: 'Choose from the top providers and newest models' }
            ),
            i18n.translate(
              'xpack.searchInferenceEndpoints.eisModelsPage.selfManagedEmpty.regionRestriction',
              { defaultMessage: 'Restrict inference traffic per region' }
            ),
            i18n.translate(
              'xpack.searchInferenceEndpoints.eisModelsPage.selfManagedEmpty.readyEndpoints',
              { defaultMessage: 'Ready-to-use endpoints or customize your own' }
            ),
          ].map((feature) => (
            <EuiFlexItem key={feature} grow={false}>
              <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiIcon type="checkCircle" color="text" aria-hidden={true} />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>{feature}</EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
        <EuiSpacer size="m" />
        <p>
          {i18n.translate(
            'xpack.searchInferenceEndpoints.eisModelsPage.selfManagedEmpty.connectDescription',
            { defaultMessage: 'Connect your cluster to Elastic Cloud for access.' }
          )}
        </p>
      </EuiText>
    }
    actions={
      <EuiButton
        fill
        iconType="external"
        iconSide="right"
        onClick={onConnectCluster}
        data-test-subj="eisConnectYourClusterButton"
      >
        {i18n.translate(
          'xpack.searchInferenceEndpoints.eisModelsPage.selfManagedEmpty.connectButtonLabel',
          { defaultMessage: 'Connect your cluster' }
        )}
      </EuiButton>
    }
    footer={
      <>
        <EuiTitle size="xxs">
          <span>
            {i18n.translate(
              'xpack.searchInferenceEndpoints.eisModelsPage.selfManagedEmpty.learnMore',
              { defaultMessage: 'Want to learn more?' }
            )}
          </span>
        </EuiTitle>{' '}
        <EuiLink
          href={docLinks.elasticInferenceService}
          target="_blank"
          external
          data-test-subj="eisDocumentationLink"
        >
          {i18n.translate(
            'xpack.searchInferenceEndpoints.eisModelsPage.selfManagedEmpty.documentationLinkText',
            { defaultMessage: 'View documentation' }
          )}
        </EuiLink>
      </>
    }
  />
);
