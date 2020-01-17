/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { ReactNode } from 'react';
import {
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiText,
  EuiLink,
  EuiCallOut,
  EuiScreenReaderOnly,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import classNames from 'classnames';
import { FormattedMessage } from '@kbn/i18n/react';
import { connect } from 'react-redux';
import { IDataPluginServices } from 'src/plugins/data/public';
import {
  GraphState,
  hasDatasourceSelector,
  hasFieldsSelector,
  requestDatasource,
  fillWorkspace,
} from '../../state_management';
import { IndexPatternSavedObject } from '../../types';
import { openSourceModal } from '../../services/source_modal';

import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';

export interface GuidancePanelProps {
  onFillWorkspace: () => void;
  onOpenFieldPicker: () => void;
  hasDatasource: boolean;
  hasFields: boolean;
  onIndexPatternSelected: (indexPattern: IndexPatternSavedObject) => void;
  noIndexPatterns: boolean;
}

function ListItem({
  children,
  state,
}: {
  state: 'done' | 'active' | 'disabled';
  children: ReactNode;
}) {
  return (
    <li
      className={classNames('gphGuidancePanel__item', {
        'gphGuidancePanel__item--disabled': state === 'disabled',
      })}
      aria-disabled={state === 'disabled'}
      aria-current={state === 'active' ? 'step' : undefined}
    >
      {state !== 'disabled' && (
        <span
          className={classNames('gphGuidancePanel__itemIcon', {
            'gphGuidancePanel__itemIcon--done': state === 'done',
          })}
          aria-hidden={true}
        >
          <EuiIcon type={state === 'active' ? 'sortRight' : 'check'} />
        </span>
      )}
      <EuiText>{children}</EuiText>
    </li>
  );
}

function GuidancePanelComponent(props: GuidancePanelProps) {
  const {
    onFillWorkspace,
    onOpenFieldPicker,
    onIndexPatternSelected,
    hasDatasource,
    hasFields,
    noIndexPatterns,
  } = props;

  const kibana = useKibana<IDataPluginServices>();
  const { services, overlays } = kibana;
  const { savedObjects, uiSettings, chrome, application } = services;
  if (!overlays || !chrome || !application) return null;

  const onOpenDatasourcePicker = () => {
    openSourceModal({ overlays, savedObjects, uiSettings }, onIndexPatternSelected);
  };

  let content = (
    <EuiPanel data-test-subj="graphGuidancePanel">
      <EuiFlexGroup direction="column" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiIcon type="graphApp" size="xxl" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText>
            <h1 id="graphHeading">
              {i18n.translate('xpack.graph.guidancePanel.title', {
                defaultMessage: 'Three steps to your graph',
              })}
            </h1>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <ol className="gphGuidancePanel__list" aria-labelledby="graphHeading">
            <ListItem state={hasDatasource ? 'done' : 'active'}>
              <EuiLink onClick={onOpenDatasourcePicker}>
                {i18n.translate(
                  'xpack.graph.guidancePanel.datasourceItem.indexPatternButtonLabel',
                  {
                    defaultMessage: 'Select a data source.',
                  }
                )}
              </EuiLink>
            </ListItem>
            <ListItem state={hasFields ? 'done' : hasDatasource ? 'active' : 'disabled'}>
              <EuiLink onClick={onOpenFieldPicker} disabled={!hasFields && !hasDatasource}>
                {i18n.translate('xpack.graph.guidancePanel.fieldsItem.fieldsButtonLabel', {
                  defaultMessage: 'Add fields.',
                })}
              </EuiLink>
            </ListItem>
            <ListItem state={hasFields ? 'active' : 'disabled'}>
              <FormattedMessage
                id="xpack.graph.guidancePanel.nodesItem.description"
                defaultMessage="Enter a query in the search bar to start exploring. Don't know where to start? {topTerms}."
                values={{
                  topTerms: (
                    <EuiLink onClick={onFillWorkspace} disabled={!hasFields}>
                      {i18n.translate('xpack.graph.guidancePanel.nodesItem.topTermsButtonLabel', {
                        defaultMessage: 'Graph the top terms',
                      })}
                    </EuiLink>
                  ),
                }}
              />
            </ListItem>
          </ol>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );

  if (noIndexPatterns) {
    const managementUrl = chrome.navLinks.get('kibana:management')!.url;
    const indexPatternUrl = `${managementUrl}/kibana/index_patterns`;
    const sampleDataUrl = `${application.getUrlForApp(
      'kibana'
    )}#/home/tutorial_directory/sampleData`;
    content = (
      <EuiPanel paddingSize="none">
        <EuiCallOut
          color="warning"
          iconType="help"
          title={i18n.translate('xpack.graph.noDataSourceNotificationMessageTitle', {
            defaultMessage: 'No data source',
          })}
          heading="h1"
        >
          <EuiScreenReaderOnly>
            <p id="graphHeading">
              {i18n.translate('xpack.graph.noDataSourceNotificationMessageTitle', {
                defaultMessage: 'No data source',
              })}
            </p>
          </EuiScreenReaderOnly>
          <p>
            <FormattedMessage
              id="xpack.graph.noDataSourceNotificationMessageText"
              defaultMessage="No data sources found. Go to {managementIndexPatternsLink} and create an index pattern for your Elasticsearch indices."
              values={{
                managementIndexPatternsLink: (
                  <a href={indexPatternUrl}>
                    <FormattedMessage
                      id="xpack.graph.noDataSourceNotificationMessageText.managementIndexPatternLinkText"
                      defaultMessage="Management &gt; Index Patterns"
                    />
                  </a>
                ),
              }}
            />
          </p>
          <p>
            <FormattedMessage
              id="xpack.graph.listing.noDataSource.newToKibanaDescription"
              defaultMessage="New to Kibana? You can also use our {sampleDataInstallLink}."
              values={{
                sampleDataInstallLink: (
                  <EuiLink href={sampleDataUrl}>
                    <FormattedMessage
                      id="xpack.graph.listing.noDataSource.sampleDataInstallLinkText"
                      defaultMessage="sample data"
                    />
                  </EuiLink>
                ),
              }}
            />
          </p>
        </EuiCallOut>
      </EuiPanel>
    );
  }

  return (
    <EuiFlexGroup justifyContent="center">
      <EuiFlexItem className="gphGuidancePanel">{content}</EuiFlexItem>
    </EuiFlexGroup>
  );
}

export const GuidancePanel = connect(
  (state: GraphState) => {
    return {
      hasDatasource: hasDatasourceSelector(state),
      hasFields: hasFieldsSelector(state),
    };
  },
  dispatch => ({
    onIndexPatternSelected: (indexPattern: IndexPatternSavedObject) => {
      dispatch(
        requestDatasource({
          type: 'indexpattern',
          id: indexPattern.id,
          title: indexPattern.attributes.title,
        })
      );
    },
    onFillWorkspace: () => {
      dispatch(fillWorkspace());
    },
  })
)(GuidancePanelComponent);
