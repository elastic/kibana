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
  EuiIcon,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { documentationService } from '../../../../../services';

export const MappingsInformationPanels = () => {
  return (
    <EuiFlexGroup direction="column" gutterSize="l">
      <EuiPanel grow={false} paddingSize="l" hasShadow={false} hasBorder>
        <EuiFlexGroup alignItems="center" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiIcon type="info" />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiTitle size="xs">
              <h2>
                <FormattedMessage
                  id="xpack.idxMgmt.indexDetails.mappings.docsCardTitle"
                  defaultMessage="About index mappings"
                />
              </h2>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <EuiText>
          <p>
            <FormattedMessage
              id="xpack.idxMgmt.indexDetails.mappings.docsCardDescription"
              defaultMessage="Your documents are made up of a set of fields. Index mappings give each field a type
                        (such as keyword, number, or date) and additional subfields. These index mappings determine the functions
                        available in your relevance tuning and search experience."
            />
          </p>
        </EuiText>
        <EuiSpacer size="m" />
        <EuiLink
          data-test-subj="indexDetailsMappingsDocsLink"
          href={documentationService.getMappingDocumentationLink()}
          target="_blank"
          external
        >
          <FormattedMessage
            id="xpack.idxMgmt.indexDetails.mappings.docsCardLink"
            defaultMessage="Learn more about mappings"
          />
        </EuiLink>
      </EuiPanel>
      <EuiPanel grow={false} paddingSize="l" hasShadow={false} hasBorder>
        <EuiFlexGroup gutterSize="s" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiIcon type="info" />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiTitle size="xs">
              <h3>
                <FormattedMessage
                  id="xpack.idxMgmt.indexDetails.mappings.transform.title"
                  defaultMessage="Transform your searchable content"
                />
              </h3>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="s" />
        <EuiText>
          <p>
            <FormattedMessage
              id="xpack.idxMgmt.indexDetails.mappings.transform.description"
              defaultMessage="Want to add custom fields, or use trained ML models 
                        to analyze and enrich your indexed documents? Use index-specific ingest pipelines 
                        to customize documents to your needs."
            />
          </p>
        </EuiText>
        <EuiSpacer size="s" />
        <EuiLink
          data-test-subj="indexDetailsMappingsLearnMoreLink"
          href={documentationService.docLinks.enterpriseSearch.ingestPipelines}
          target="_blank"
          external
        >
          <FormattedMessage
            id="xpack.idxMgmt.indexDetails.mappings.transform.docLink"
            defaultMessage="Learn more"
          />
        </EuiLink>
      </EuiPanel>
    </EuiFlexGroup>
  );
};
