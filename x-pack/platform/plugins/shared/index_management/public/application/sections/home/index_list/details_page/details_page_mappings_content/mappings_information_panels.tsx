/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiBreakpoint,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EisCloudConnectPromoCallout,
  EisPromotionalCallout,
  EisUpdateCallout,
} from '@kbn/search-api-panels';
import { CLOUD_CONNECT_NAV_ID } from '@kbn/deeplinks-management/constants';

import { documentationService } from '../../../../../services';
import { useAppContext } from '../../../../../app_context';
import {
  hasElserOnMlNodeSemanticTextField,
  hasSemanticTextField,
} from '../../../../../components/mappings_editor/lib/utils';
import { useMappingsState } from '../../../../../components/mappings_editor/mappings_state_context';
import { UpdateElserMappingsModal } from '../update_elser_mappings/update_elser_mappings_modal';
import { useLicense } from '../../../../../../hooks/use_license';

interface MappingsInformationPanelsProps {
  indexName: string;
  hasUpdateMappingsPrivilege: boolean | undefined;
  refetchMapping: () => void;
}

export const MappingsInformationPanels = ({
  indexName,
  hasUpdateMappingsPrivilege,
  refetchMapping,
}: MappingsInformationPanelsProps) => {
  const {
    plugins: { cloud },
    core: { application },
  } = useAppContext();
  const state = useMappingsState();
  const { isAtLeastEnterprise } = useLicense();

  const [isUpdatingElserMappings, setIsUpdatingElserMappings] = useState<boolean>(false);

  const showAboutMappingsStyles = css`
    ${useEuiBreakpoint(['xl'])} {
      max-width: 480px;
    }
  `;

  const hasSemanticText = hasSemanticTextField(state.mappingViewFields);
  const hasElserOnMlNodeSemanticText = hasElserOnMlNodeSemanticTextField(state.mappingViewFields);
  const shouldShowEisUpdateCallout =
    (cloud?.isCloudEnabled && (isAtLeastEnterprise() || cloud?.isServerlessEnabled)) ?? false;

  return (
    <EuiFlexItem grow={false} css={showAboutMappingsStyles}>
      <EuiFlexGroup direction="column" gutterSize="l">
        {hasSemanticText && (
          <>
            {hasElserOnMlNodeSemanticText ? (
              <EisUpdateCallout
                ctaLink={documentationService.docLinks.enterpriseSearch.elasticInferenceService}
                promoId="indexDetailsMappings"
                shouldShowEisUpdateCallout={shouldShowEisUpdateCallout}
                handleOnClick={() => setIsUpdatingElserMappings(true)}
                direction="column"
                hasUpdatePrivileges={hasUpdateMappingsPrivilege}
              />
            ) : (
              <EisPromotionalCallout
                promoId="indexDetailsMappings"
                isCloudEnabled={cloud?.isCloudEnabled ?? false}
                ctaLink={documentationService.docLinks.enterpriseSearch.elasticInferenceService}
                direction="column"
              />
            )}
            {isUpdatingElserMappings && (
              <UpdateElserMappingsModal
                indexName={indexName}
                refetchMapping={refetchMapping}
                setIsModalOpen={setIsUpdatingElserMappings}
                hasUpdatePrivileges={hasUpdateMappingsPrivilege}
                modalId="indexDetailsMappings"
              />
            )}
          </>
        )}
        <EisCloudConnectPromoCallout
          promoId="indexDetailsMappings"
          isSelfManaged={!cloud?.isCloudEnabled}
          direction="column"
          navigateToApp={() =>
            application.navigateToApp(CLOUD_CONNECT_NAV_ID, { openInNewTab: true })
          }
        />
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
    </EuiFlexItem>
  );
};
