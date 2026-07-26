/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiText,
  EuiTextColor,
  EuiLink,
} from '@elastic/eui';
import type {
  LanguageDefinition,
  LanguageDefinitionSnippetArguments,
} from '@kbn/search-api-panels';
import {
  CodeBox,
  getLanguageDefinitionCodeSnippet,
  getConsoleRequest,
  EisCloudConnectPromoCallout,
  EisUpdateCallout,
  useCloudConnectStatus,
} from '@kbn/search-api-panels';
import { CLOUD_CONNECT_NAV_ID } from '@kbn/deeplinks-management/constants';
import type { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import { type Index } from '../../../../../../../common';
import { useAppContext } from '../../../../../app_context';
import { documentationService, useLoadIndexMappings } from '../../../../../services';
import { languageDefinitions, curlDefinition } from './languages';

import { UpdateElserMappingsModal } from '../update_elser_mappings/update_elser_mappings_modal';
import { useMappingsState } from '../../../../../components/mappings_editor/mappings_state_context';
import { hasElserOnMlNodeSemanticTextField } from '../../../../../components/mappings_editor/lib/utils';
import { useMappingsStateListener } from '../../../../../components/mappings_editor/use_state_listener';
import { parseMappings } from '../../../../../shared/parse_mappings';
import { useUserPrivileges } from '../../../../../services/api';
import { useLicense } from '../../../../../../hooks/use_license';
import { IndexDocuments } from '../index_documents/index_documents';
import { QuickStats } from '../quick_stats/quick_stats';

interface Props {
  indexDetails: Index;
  sampleDocuments: SearchHit[];
  isDocumentsLoading: boolean;
  documentsError: unknown;
}

export const DetailsPageOverview: React.FunctionComponent<Props> = ({
  indexDetails,
  sampleDocuments,
  isDocumentsLoading,
  documentsError,
}) => {
  const { name } = indexDetails;
  const {
    core,
    plugins: { cloud, cloudConnect, share },
    services: { extensionsService },
  } = useAppContext();
  const state = useMappingsState();
  const { data: mappingsData, resendRequest } = useLoadIndexMappings(name || '');
  const { isAtLeastEnterprise } = useLicense();

  const [selectedLanguage, setSelectedLanguage] = useState<LanguageDefinition>(curlDefinition);
  const [elasticsearchUrl, setElasticsearchUrl] = useState<string>('');
  const hasElserOnMlNodeSemanticText = hasElserOnMlNodeSemanticTextField(state.mappingViewFields);
  const [isUpdatingElserMappings, setIsUpdatingElserMappings] = useState<boolean>(false);

  const { data } = useUserPrivileges(indexDetails.name);
  const hasUpdateMappingsPrivileges = data?.privileges?.canManageIndex === true;

  const codeSnippetArguments: LanguageDefinitionSnippetArguments = {
    url: elasticsearchUrl,
    apiKey: 'your_api_key',
    indexName: name,
  };

  const {
    isLoading: isCloudConnectStatusLoading,
    isCloudConnected,
    isCloudConnectedWithEisEnabled,
  } = useCloudConnectStatus(cloudConnect?.hooks.useCloudConnectStatus);

  const shouldShowEisUpdateCallout =
    ((cloud?.isCloudEnabled || isCloudConnectedWithEisEnabled) &&
      (isAtLeastEnterprise() || cloud?.isServerlessEnabled)) ??
    false;

  const { parsedDefaultValue } = useMemo(
    () => parseMappings(mappingsData ?? undefined),
    [mappingsData]
  );

  useMappingsStateListener({ value: parsedDefaultValue, status: 'disabled' });

  useEffect(() => {
    cloud?.fetchElasticsearchConfig().then((config) => {
      setElasticsearchUrl(config.elasticsearchUrl || 'https://your_deployment_url');
    });
  }, [cloud]);

  return (
    <>
      {!isCloudConnectStatusLoading && !isCloudConnected && (
        <EisCloudConnectPromoCallout
          promoId="indexDetailsOverview"
          isSelfManaged={!cloud?.isCloudEnabled}
          direction="row"
          navigateToApp={() =>
            core.application.navigateToApp(CLOUD_CONNECT_NAV_ID, { openInNewTab: true })
          }
          addSpacer="bottom"
        />
      )}
      {hasElserOnMlNodeSemanticText && (
        <EisUpdateCallout
          ctaLink={documentationService.docLinks.enterpriseSearch.elasticInferenceService}
          promoId="indexDetailsOverview"
          shouldShowEisUpdateCallout={shouldShowEisUpdateCallout}
          handleOnClick={() => setIsUpdatingElserMappings(true)}
          direction="row"
          hasUpdatePrivileges={hasUpdateMappingsPrivileges}
          addSpacer="bottom"
        />
      )}
      {isUpdatingElserMappings && (
        <UpdateElserMappingsModal
          indexName={name}
          refetchMapping={resendRequest}
          setIsModalOpen={setIsUpdatingElserMappings}
          hasUpdatePrivileges={hasUpdateMappingsPrivileges}
          modalId="indexDetailsOverview"
        />
      )}

      <QuickStats indexDetails={indexDetails} />

      <EuiSpacer />

      {extensionsService.indexOverviewContent ? (
        extensionsService.indexOverviewContent.renderContent({
          index: indexDetails,
          getUrlForApp: core.getUrlForApp,
        })
      ) : (
        <EuiFlexGroup direction="column">
          <EuiFlexItem>
            <EuiTitle size="s">
              <h2>
                {i18n.translate('xpack.idxMgmt.indexDetails.overviewTab.addMoreDataTitle', {
                  defaultMessage: 'Add data to this index',
                })}
              </h2>
            </EuiTitle>

            <EuiSpacer size="s" />

            <EuiTextColor color="subdued">
              <EuiText size="s">
                <p>
                  <FormattedMessage
                    id="xpack.idxMgmt.indexDetails.overviewTab.addMoreDataDescription"
                    defaultMessage="Use the bulk API to add data to your index. {docsLink}"
                    values={{
                      docsLink: (
                        <EuiLink href={documentationService.getBulkApi()} target="_blank" external>
                          <FormattedMessage
                            id="xpack.idxMgmt.indexDetails.overviewTab.addDocsLink"
                            defaultMessage="Learn more."
                          />
                        </EuiLink>
                      ),
                    }}
                  />
                </p>
              </EuiText>
            </EuiTextColor>
          </EuiFlexItem>

          <EuiFlexItem>
            <CodeBox
              languages={languageDefinitions}
              codeSnippet={getLanguageDefinitionCodeSnippet(
                selectedLanguage,
                'ingestDataIndex',
                codeSnippetArguments
              )}
              selectedLanguage={selectedLanguage}
              setSelectedLanguage={setSelectedLanguage}
              assetBasePath={core.http.basePath.prepend(`/plugins/indexManagement/assets`)}
              sharePlugin={share}
              application={core.application}
              consoleRequest={getConsoleRequest('ingestDataIndex', codeSnippetArguments)}
            />
          </EuiFlexItem>
          <IndexDocuments
            documents={sampleDocuments}
            isLoading={isDocumentsLoading}
            error={documentsError}
            mappings={mappingsData ?? undefined}
          />
        </EuiFlexGroup>
      )}
    </>
  );
};
