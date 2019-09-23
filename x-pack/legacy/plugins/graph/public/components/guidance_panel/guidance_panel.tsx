/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, ReactNode } from 'react';
import { EuiPanel, EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import classNames from 'classnames';

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
        'graphGuidancePanel__item--disabled': disabled,
      })}
    >
      <EuiIcon type="check" className="gphGuidancePanel__itemIcon" />
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
    <EuiPanel>
      <EuiFlexGroup direction="column" className="gphGuidancePanel">
        <EuiFlexItem>
          <EuiIcon type="graphApp" size="xxl" />
          <EuiText>
            <h1>
              {i18n.translate('xpack.graph.guidancePanel.title', {
                defaultMessage: "Let's get started!",
              })}
            </h1>
            <ul className="graphGuidancePanel__list">
              <ListItem disabled={false}>
                Choose an <EuiLink onClick={onOpenDatasourcePicker}>index pattern</EuiLink> above
              </ListItem>
              <ListItem disabled={!hasDatasource}>
                <EuiLink onClick={onOpenFieldPicker}>Select fields</EuiLink> to explore
              </ListItem>
              <ListItem disabled={!hasFields}>
                It's time to search for something you are interested in in the search bar above or
                you can try our suggestion to{' '}
                <EuiLink onClick={onFillWorkspace}>
                  show top terms and correlations among them
                </EuiLink>
              </ListItem>
            </ul>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
