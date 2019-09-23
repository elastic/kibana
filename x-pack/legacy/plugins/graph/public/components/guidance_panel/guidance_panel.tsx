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

export interface GuidancePanelProps {
  onFillWorkspace: () => void;
  onOpenFieldPicker: () => void;
  onOpenDatasourcePicker: () => void;
  hasDatasource: boolean;
  hasFields: boolean;
}

function ListItem({ children, disabled }: { children: ReactNode; disabled: boolean }) {
  return (
    <li
      className={classNames('gphGuidancePanel__item', {
        'gphGuidancePanel__item--disabled': disabled,
      })}
      aria-disabled={disabled}
    >
      <EuiIcon type="check" className="gphGuidancePanel__itemIcon" aria-hidden={true} />
      {children}
    </li>
  );
}

export function GuidancePanel(props: GuidancePanelProps) {
  const {
    onFillWorkspace,
    onOpenFieldPicker,
    onOpenDatasourcePicker,
    hasDatasource,
    hasFields,
  } = props;

  return (
    <EuiFlexGroup justifyContent="center">
      <EuiFlexItem className="gphGuidancePanel">
        <EuiPanel>
          <EuiFlexGroup direction="column" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiIcon type="graphApp" size="xxl" />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText>
                <h1>
                  {i18n.translate('xpack.graph.guidancePanel.title', {
                    defaultMessage: "Let's get started!",
                  })}
                </h1>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <ul className="gphGuidancePanel__list">
                <ListItem disabled={false}>
                  <FormattedMessage
                    id="xpack.graph.guidancePanel.datasource.item"
                    defaultMessage="Choose an {indexpattern} above"
                    values={{
                      indexpattern: (
                        <EuiLink onClick={onOpenDatasourcePicker}>
                          {i18n.translate('xpack.graph.guidancePanel.datasource.indexpattern', {
                            defaultMessage: 'index pattern',
                          })}
                        </EuiLink>
                      ),
                    }}
                  />
                </ListItem>
                <ListItem disabled={!hasDatasource}>
                  <FormattedMessage
                    id="xpack.graph.guidancePanel.fields.item"
                    defaultMessage="{fields} to explore"
                    values={{
                      fields: (
                        <EuiLink onClick={onOpenFieldPicker}>
                          {i18n.translate('xpack.graph.guidancePanel.fields.selectfields', {
                            defaultMessage: 'Select fields',
                          })}
                        </EuiLink>
                      ),
                    }}
                  />
                </ListItem>
                <ListItem disabled={!hasFields}>
                  <FormattedMessage
                    id="xpack.graph.guidancePanel.nodes.item"
                    defaultMessage=" It's time to search for something you are interested in in the search bar above! You can also try our suggestion to {topTerms}"
                    values={{
                      topTerms: (
                        <EuiLink onClick={onFillWorkspace}>
                          {i18n.translate('xpack.graph.guidancePanel.nodes.topTerms', {
                            defaultMessage: 'show top terms and correlations among them',
                          })}
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
