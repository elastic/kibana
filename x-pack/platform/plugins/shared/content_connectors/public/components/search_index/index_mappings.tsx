/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiCallOut,
  EuiCode,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { CONNECTORS_ACCESS_CONTROL_INDEX_PREFIX } from '@kbn/search-connectors';

import { useKibana } from '@kbn/kibana-react-plugin/public';
import { IndexNameLogic } from './index_name_logic';
import { IndexViewLogic } from './index_view_logic';

import './index_mappings.scss';
import { docLinks } from '../shared/doc_links';
import {
  AccessControlIndexSelector,
  AccessControlSelectorOption,
} from './access_control_index_selector/access_control_index_selector';
import { mappingsWithPropsApiLogic } from '../../api/mappings/mappings_logic';
import { stripSearchPrefix } from '../../utils/strip_search_prefix';
import { useAppContext } from '../../app_context';

export const SearchIndexIndexMappings: React.FC = () => {
  const {
    services: { http },
  } = useKibana();
  const { indexName } = useValues(IndexNameLogic);
  const { hasDocumentLevelSecurityFeature, isHiddenIndex } = useValues(IndexViewLogic({ http }));
  const { indexMappingComponent } = useAppContext();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const IndexMappingComponent = useMemo(() => indexMappingComponent, []);

  const [selectedIndexType, setSelectedIndexType] =
    useState<AccessControlSelectorOption['value']>('content-index');
  const indexToShow =
    selectedIndexType === 'content-index'
      ? indexName
      : stripSearchPrefix(indexName, CONNECTORS_ACCESS_CONTROL_INDEX_PREFIX);
  const { makeRequest: makeMappingRequest } = useActions(mappingsWithPropsApiLogic(indexToShow));
  const { error } = useValues(mappingsWithPropsApiLogic(indexToShow));
  const shouldShowAccessControlSwitch = hasDocumentLevelSecurityFeature;
  const isAccessControlIndexNotFound =
    shouldShowAccessControlSwitch && error?.body?.statusCode === 404;

  useEffect(() => {
    makeMappingRequest({ indexName: indexToShow, http });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indexToShow, indexName]);

  return (
    <>
      <EuiFlexGroup>
        <EuiFlexItem grow={2}>
          <EuiFlexGroup direction="column" gutterSize="s">
            {shouldShowAccessControlSwitch && (
              <EuiFlexItem grow={false} className="enterpriseSearchMappingsSelector">
                <AccessControlIndexSelector
                  fullWidth
                  onChange={setSelectedIndexType}
                  valueOfSelected={selectedIndexType}
                />
              </EuiFlexItem>
            )}
            <EuiFlexItem grow>
              {isAccessControlIndexNotFound ? (
                <EuiCallOut
                  size="m"
                  title={i18n.translate(
                    'xpack.contentConnectors.content.searchIndex.mappings.noIndex.title',
                    { defaultMessage: 'Access Control Index not found' }
                  )}
                  iconType="info"
                >
                  <p>
                    {i18n.translate(
                      'xpack.contentConnectors.content.searchIndex.mappings.noIndex',
                      {
                        defaultMessage:
                          "An Access Control Index won't be created until you enable document-level security and run your first access control sync.",
                      }
                    )}
                  </p>
                </EuiCallOut>
              ) : (
                <>
                  {IndexMappingComponent ? (
                    <IndexMappingComponent
                      index={{
                        aliases: [],
                        hidden: isHiddenIndex,
                        isFrozen: false,
                        name: indexToShow,
                      }}
                      showAboutMappings={false}
                    />
                  ) : (
                    <EuiCallOut
                      color="danger"
                      iconType="warn"
                      title={i18n.translate(
                        'xpack.contentConnectors.content.searchIndex.mappings.noMappingsComponent',
                        { defaultMessage: 'Mappings component not found' }
                      )}
                    />
                  )}
                </>
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={1}>
          <EuiPanel grow={false} hasShadow={false} hasBorder>
            <EuiFlexGroup justifyContent="center" gutterSize="s" alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiIcon type="info" />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiTitle size="xs">
                  <h3>
                    {i18n.translate('xpack.contentConnectors.content.searchIndex.mappings.title', {
                      defaultMessage: 'About index mappings',
                    })}
                  </h3>
                </EuiTitle>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="s" />
            <EuiText size="s">
              <p>
                <FormattedMessage
                  id="xpack.contentConnectors.content.searchIndex.mappings.description"
                  defaultMessage="Your documents are made up of a set of fields. Index mappings give each field a type (such as {keyword}, {number}, or {date}) and additional subfields. By default, search optimized mappings are used which can be customized as needed to best fit your search use case."
                  values={{
                    date: <EuiCode>date</EuiCode>,
                    keyword: <EuiCode>keyword</EuiCode>,
                    number: <EuiCode>number</EuiCode>,
                  }}
                />
              </p>
            </EuiText>
            <EuiSpacer size="s" />
            <EuiLink
              data-test-subj="enterpriseSearchSearchIndexIndexMappingsLearnHowToCustomizeIndexMappingsAndSettingsLink"
              href={docLinks.connectorsMappings}
              target="_blank"
              external
            >
              {i18n.translate('xpack.contentConnectors.content.searchIndex.mappings.docLink', {
                defaultMessage: 'Learn how to customize index mappings and settings',
              })}
            </EuiLink>
          </EuiPanel>
          <EuiSpacer />
          <EuiPanel grow={false} hasShadow={false} hasBorder>
            <EuiFlexGroup justifyContent="center" gutterSize="s" alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiIcon type="info" />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiTitle size="xs">
                  <h3>
                    {i18n.translate('xpack.contentConnectors.content.searchIndex.transform.title', {
                      defaultMessage: 'Transform your searchable content',
                    })}
                  </h3>
                </EuiTitle>
              </EuiFlexItem>
            </EuiFlexGroup>

            <EuiSpacer size="s" />
            <EuiText size="s">
              <p>
                <FormattedMessage
                  id="xpack.contentConnectors.content.searchIndex.transform.description"
                  defaultMessage="Want to add custom fields, or use trained ML models to analyze and enrich your indexed documents? Use index-specific ingest pipelines to customize documents to your needs."
                />
              </p>
            </EuiText>
            <EuiSpacer size="s" />
            <EuiLink
              data-test-subj="enterpriseSearchSearchIndexIndexMappingsLearnMoreLink"
              href={docLinks.ingestPipelines}
              target="_blank"
              external
            >
              {i18n.translate('xpack.contentConnectors.content.searchIndex.transform.docLink', {
                defaultMessage: 'Learn more',
              })}
            </EuiLink>
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
