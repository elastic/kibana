/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import lightTheme from '@elastic/eui/dist/eui_theme_light.json';
import { i18n } from '@kbn/i18n';
import cytoscape from 'cytoscape';
import React from 'react';
import styled from 'styled-components';

const ItemRow = styled.div`
  line-height: 2;
`;

const ItemTitle = styled.dt`
  color: ${lightTheme.textColors.subdued};
`;

const ItemDescription = styled.dd``;

interface InfoProps extends cytoscape.NodeDataDefinition {
  type?: string;
  subtype?: string;
}

export function Info({ type, subtype }: InfoProps) {
  const listItems = [
    {
      title: i18n.translate('xpack.apm.serviceMap.typePopoverMetric', {
        defaultMessage: 'Type'
      }),
      description: type
    },
    {
      title: i18n.translate('xpack.apm.serviceMap.subtypePopoverMetric', {
        defaultMessage: 'Subtype'
      }),
      description: subtype
    }
  ];

  return (
    <>
      {listItems.map(
        ({ title, description }) =>
          description && (
            <ItemRow key={title}>
              <ItemTitle>{title}</ItemTitle>
              <ItemDescription>{description}</ItemDescription>
            </ItemRow>
          )
      )}
    </>
  );
}
