/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { ReactNode } from 'react';
import { EuiPanel, EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import classNames from 'classnames';
import { FormattedMessage } from '@kbn/i18n/react';
import { connect } from 'react-redux';
import { IDataPluginServices } from 'src/legacy/core_plugins/data/public/types';
import {
  GraphState,
  hasDatasourceSelector,
  hasFieldsSelector,
  requestDatasource,
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
  } = props;

  const kibana = useKibana<IDataPluginServices>();
  const { overlays, savedObjects, uiSettings } = kibana.services;
  if (!overlays) return null;

  const onOpenDatasourcePicker = () => {
    openSourceModal({ overlays, savedObjects, uiSettings }, onIndexPatternSelected);
  };

  return (
    <EuiFlexGroup justifyContent="center">
      <EuiFlexItem className="gphGuidancePanel">
        <EuiPanel data-test-subj="graphGuidancePanel">
          <EuiFlexGroup direction="column" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiIcon type="graphApp" size="xxl" />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText>
                <h1
                  aria-label={i18n.translate('xpack.graph.guidancePanel.ariaLabel', {
                    defaultMessage: "Let's get started building your first graph!",
                  })}
                >
                  {i18n.translate('xpack.graph.guidancePanel.title', {
                    defaultMessage: "Let's get started!",
                  })}
                </h1>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <ul className="gphGuidancePanel__list">
                <ListItem state={hasDatasource ? 'done' : 'active'}>
                  <FormattedMessage
                    id="xpack.graph.guidancePanel.datasourceItem.description"
                    defaultMessage="Choose an {indexpattern}"
                    values={{
                      indexpattern: (
                        <EuiLink onClick={onOpenDatasourcePicker}>
                          {i18n.translate(
                            'xpack.graph.guidancePanel.datasourceItem.indexPatternButtonLabel',
                            {
                              defaultMessage: 'index pattern',
                            }
                          )}
                        </EuiLink>
                      ),
                    }}
                  />
                </ListItem>
                <ListItem state={hasFields ? 'done' : hasDatasource ? 'active' : 'disabled'}>
                  <FormattedMessage
                    id="xpack.graph.guidancePanel.fieldsItem.description"
                    defaultMessage="{fields} to explore"
                    values={{
                      fields: (
                        <EuiLink onClick={onOpenFieldPicker}>
                          {i18n.translate(
                            'xpack.graph.guidancePanel.fieldsItem.fieldsButtonLabel',
                            {
                              defaultMessage: 'Select fields',
                            }
                          )}
                        </EuiLink>
                      ),
                    }}
                  />
                </ListItem>
                <ListItem state={hasFields ? 'active' : 'disabled'}>
                  <FormattedMessage
                    id="xpack.graph.guidancePanel.nodesItem.description"
                    defaultMessage="Search for something in the search bar above to begin exploration. If you don't know where to start, you can also {topTerms}"
                    values={{
                      topTerms: (
                        <EuiLink onClick={onFillWorkspace}>
                          {i18n.translate(
                            'xpack.graph.guidancePanel.nodesItem.topTermsButtonLabel',
                            {
                              defaultMessage: 'show correlations of the top terms',
                            }
                          )}
                        </EuiLink>
                      ),
                    }}
                  />
                </ListItem>
              </ul>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </EuiFlexItem>
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
  })
)(GuidancePanelComponent);
