/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { isEmpty } from 'lodash';
import { Hint } from 'react-vis';
import styled from 'styled-components';
import PropTypes from 'prop-types';
import {
  unit,
  units,
  px,
  borderRadius,
  fontSize,
  fontSizes
} from '../../../../style/variables';
import Legend from '../Legend';
import theme from '@elastic/eui/dist/eui_theme_light.json';
import { asAbsoluteDateTime } from '../../../../utils/formatters';

const TooltipElm = styled.div`
  margin: 0 ${px(unit)};
  transform: translateY(-50%);
  border: 1px solid ${theme.euiColorLightShade};
  background: ${theme.euiColorEmptyShade};
  border-radius: ${borderRadius};
  font-size: ${fontSize};
  color: ${theme.euiColorFullShade};
`;

const Header = styled.div`
  background: ${theme.euiColorLightestShade};
  border-bottom: 1px solid ${theme.euiColorLightShade};
  border-radius: ${borderRadius} ${borderRadius} 0 0;
  padding: ${px(units.half)};
  color: ${theme.euiColorMediumShade};
`;

const Content = styled.div`
  margin: ${px(units.half)};
  margin-right: ${px(unit)};
  font-size: ${fontSizes.small};
`;

const Footer = styled.div`
  color: ${theme.euiColorMediumShade};
  margin: ${px(units.half)};
  font-size: ${fontSizes.small};
`;

const LegendContainer = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: ${px(units.quarter)};
  justify-content: space-between;
`;

const LegendGray = styled(Legend)`
  color: ${theme.euiColorMediumShade};
  padding-bottom: 0;
  padding-right: ${px(units.half)};
`;

const Value = styled.div`
  color: ${theme.euiColorDarkShade};
  font-size: ${fontSize};
`;

export default function Tooltip({
  header,
  footer,
  tooltipPoints,
  x,
  y,
  ...props
}) {
  if (isEmpty(tooltipPoints)) {
    return null;
  }

  // Only show legend labels if there is more than 1 data set
  const showLegends = tooltipPoints.length > 1;

  return (
    <Hint {...props} value={{ x, y }}>
      <TooltipElm>
        <Header>{header || asAbsoluteDateTime(x, 'seconds')}</Header>

        <Content>
          {showLegends ? (
            tooltipPoints.map((point, i) => (
              <LegendContainer key={i}>
                <LegendGray
                  fontSize={fontSize.tiny}
                  radius={units.half}
                  color={point.color}
                  text={point.text}
                />

                <Value>{point.value}</Value>
              </LegendContainer>
            ))
          ) : (
            <Value>{tooltipPoints[0].value}</Value>
          )}
        </Content>
        <Footer>{footer}</Footer>
      </TooltipElm>
    </Hint>
  );
}

Tooltip.propTypes = {
  header: PropTypes.string,
  tooltipPoints: PropTypes.array.isRequired,
  x: PropTypes.number,
  y: PropTypes.number
};

Tooltip.defaultProps = {};
