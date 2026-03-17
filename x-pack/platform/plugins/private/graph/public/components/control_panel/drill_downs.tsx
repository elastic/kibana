/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiLink, EuiPanel, EuiText } from '@elastic/eui';
import type { UrlTemplate } from '../../types';
import { IconRenderer } from '../icon_renderer';
import { gphSidebarHeaderStyles, gphSidebarPanelStyles, noUserSelectStyles } from '../../styles';

interface DrillDownsProps {
  urlTemplates: UrlTemplate[];
  openUrlTemplate: (template: UrlTemplate) => void;
}

export const DrillDowns = ({ urlTemplates, openUrlTemplate }: DrillDownsProps) => {
  return (
    <div>
      <div css={gphSidebarHeaderStyles}>
        <EuiIcon type="info" aria-hidden={true} />{' '}
        {i18n.translate('xpack.graph.sidebar.drillDownsTitle', {
          defaultMessage: 'Drill-downs',
        })}
      </div>

      <div css={gphSidebarPanelStyles}>
        {urlTemplates.length === 0 && (
          <EuiText color="subdued" size="s">
            <p>
              {i18n.translate('xpack.graph.sidebar.drillDowns.noDrillDownsHelpText', {
                defaultMessage: 'Configure drill-downs from the settings menu',
              })}
            </p>
          </EuiText>
        )}

        <EuiFlexGroup direction="column" gutterSize="s" responsive={false}>
          {urlTemplates.map((urlTemplate) => {
            const onOpenUrlTemplate = () => openUrlTemplate(urlTemplate);

            return (
              <EuiFlexItem grow={false} key={urlTemplate.url}>
                <EuiPanel hasBorder hasShadow={false} paddingSize="s">
                  <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                    {urlTemplate.icon && (
                      <EuiFlexItem grow={false}>
                        <IconRenderer icon={urlTemplate.icon} css={noUserSelectStyles} />
                      </EuiFlexItem>
                    )}
                    <EuiFlexItem grow={false}>
                      <EuiLink onClick={onOpenUrlTemplate}>{urlTemplate.description}</EuiLink>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiPanel>
              </EuiFlexItem>
            );
          })}
        </EuiFlexGroup>
      </div>
    </div>
  );
};
