/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { EuiFlexGrid, EuiFlexItem } from '@elastic/eui';
import styled from 'styled-components';
import euiLightVars from '@elastic/eui/dist/eui_theme_light.json';
import { px, units } from '../../../../public/style/variables';

interface Props {
  items: Array<React.ReactElement | null | undefined>;
}

// TODO: Light/Dark theme (@see https://github.com/elastic/kibana/issues/44840)
const theme = euiLightVars;

const Item = styled(EuiFlexItem)`
  flex-wrap: nowrap;
  border-right: 1px solid ${theme.euiColorLightShade};
  padding-right: ${px(units.half)};
  flex-flow: row nowrap;
  line-height: 1.5;
  align-items: center !important;
  &:last-child {
    border-right: none;
    padding-right: 0;
  }
`;

const Summary = ({ items }: Props) => {
  const filteredItems = items.filter(Boolean) as React.ReactElement[];

  return (
    <EuiFlexGrid gutterSize="s">
      {filteredItems.map((item, index) => (
        <Item key={index} grow={false}>
          {item}
        </Item>
      ))}
    </EuiFlexGrid>
  );
};

export { Summary };
