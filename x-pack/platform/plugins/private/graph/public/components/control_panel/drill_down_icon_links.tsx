/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import React from 'react';
import { UrlTemplate } from '../../types';
import { IconRenderer } from '../icon_renderer';

interface UrlTemplateButtonsProps {
  urlTemplates: UrlTemplate[];
  hasNodes: boolean;
  openUrlTemplate: (template: UrlTemplate) => void;
}

export const DrillDownIconLinks = ({
  hasNodes,
  urlTemplates,
  openUrlTemplate,
}: UrlTemplateButtonsProps) => {
  const drillDownsWithIcons = urlTemplates.filter(
    ({ icon }: UrlTemplate) => icon && icon.id !== ''
  );

  if (drillDownsWithIcons.length === 0) {
    return null;
  }

  const drillDowns = drillDownsWithIcons.map((cur) => {
    const onUrlTemplateClick = () => openUrlTemplate(cur);

    return (
      <EuiFlexItem grow={false}>
        <EuiToolTip content={cur.description}>
          <EuiButtonIcon
            iconType={cur.icon ? () => <IconRenderer icon={cur.icon} /> : ''}
            size="xs"
            isDisabled={hasNodes}
            onClick={onUrlTemplateClick}
          />
        </EuiToolTip>
      </EuiFlexItem>
    );
  });

  return (
    <EuiFlexGroup
      className="gphDrillDownIconLinks"
      justifyContent="flexStart"
      alignItems="center"
      gutterSize="xs"
      responsive={false}
    >
      {drillDowns}
    </EuiFlexGroup>
  );
};
