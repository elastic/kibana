/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiIcon, EuiLink } from '@elastic/eui';
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
        <EuiIcon type="info" />{' '}
        {i18n.translate('xpack.graph.sidebar.drillDownsTitle', {
          defaultMessage: 'Drill-downs',
        })}
      </div>

      <div css={gphSidebarPanelStyles}>
        {urlTemplates.length === 0 && (
          <p className="help-block">
            {i18n.translate('xpack.graph.sidebar.drillDowns.noDrillDownsHelpText', {
              defaultMessage: 'Configure drill-downs from the settings menu',
            })}
          </p>
        )}

        <ul className="list-group">
          {urlTemplates.map((urlTemplate) => {
            const onOpenUrlTemplate = () => openUrlTemplate(urlTemplate);

            return (
              <li className="list-group-item">
                {urlTemplate.icon && (
                  <>
                    <IconRenderer icon={urlTemplate.icon} css={noUserSelectStyles} />{' '}
                  </>
                )}
                <EuiLink onClick={onOpenUrlTemplate}>{urlTemplate.description}</EuiLink>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};
