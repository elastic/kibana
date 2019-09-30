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

function ListItem({
  children,
  disabled,
  selected,
}: {
  children: ReactNode;
  disabled: boolean;
  selected: boolean;
}) {
  return (
    <li
      className={classNames('gphGuidancePanel__item', {
        'gphGuidancePanel__item--disabled': disabled,
      })}
      aria-disabled={disabled}
    >
      {selected && (
        <EuiIcon
          color="secondary"
          type="check"
          className="gphGuidancePanel__itemIcon"
          aria-hidden={true}
          size="l"
        />
      )}
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
                <ListItem disabled={false} selected={hasDatasource}>
                  <FormattedMessage
                    id="xpack.graph.guidancePanel.datasourceItem.description"
                    defaultMessage="Choose an {indexpattern} above"
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
                <ListItem disabled={!hasDatasource} selected={hasFields}>
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
                <ListItem disabled={!hasFields} selected={false}>
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
