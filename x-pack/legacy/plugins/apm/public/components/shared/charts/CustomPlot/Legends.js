/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import PropTypes from 'prop-types';
import React from 'react';
import styled from 'styled-components';
import Legend from '../Legend';
import {
  unit,
  units,
  fontSizes,
  px,
  truncate
} from '../../../../style/variables';
import theme from '@elastic/eui/dist/eui_theme_light.json';

const Container = styled.div`
  display: flex;
  margin-left: ${px(unit * 5)};
  flex-wrap: wrap;

  /* add margin to all direct descendant divs */
  & > div {
    margin-top: ${px(units.half)};
    margin-right: ${px(unit)};
    &:last-child {
      margin-right: 0;
    }
  }
`;

const LegendContent = styled.span`
  white-space: nowrap;
  color: ${theme.euiColorMediumShade};
  display: flex;
`;

const TruncatedLabel = styled.span`
  display: inline-block;
  ${truncate(px(units.half * 10))};
`;

const SeriesValue = styled.span`
  margin-left: ${px(units.quarter)};
  color: ${theme.euiColorFullShade};
  display: inline-block;
`;

const MoreSeriesContainer = styled.div`
  font-size: ${fontSizes.small};
  color: ${theme.euiColorMediumShade};
`;

function MoreSeries({ hiddenSeriesCount }) {
  if (hiddenSeriesCount <= 0) {
    return null;
  }

  return (
    <MoreSeriesContainer>
      (+
      {hiddenSeriesCount})
    </MoreSeriesContainer>
  );
}

export default function Legends({
  clickLegend,
  hiddenSeriesCount,
  noHits,
  series,
  seriesEnabledState,
  truncateLegends
}) {
  if (noHits) {
    return null;
  }

  return (
    <Container>
      {series.map((serie, i) => {
        if (serie.hideLegend) {
          return null;
        }
        const text = (
          <LegendContent>
            {truncateLegends ? (
              <TruncatedLabel title={serie.title}>{serie.title}</TruncatedLabel>
            ) : (
              serie.title
            )}
            {serie.legendValue && (
              <SeriesValue>{serie.legendValue}</SeriesValue>
            )}
          </LegendContent>
        );
        return (
          <Legend
            key={i}
            onClick={() => clickLegend(i)}
            disabled={seriesEnabledState[i]}
            text={text}
            color={serie.color}
          />
        );
      })}
      <MoreSeries hiddenSeriesCount={hiddenSeriesCount} />
    </Container>
  );
}

Legends.propTypes = {
  clickLegend: PropTypes.func.isRequired,
  hiddenSeriesCount: PropTypes.number.isRequired,
  noHits: PropTypes.bool.isRequired,
  series: PropTypes.array.isRequired,
  seriesEnabledState: PropTypes.array.isRequired,
  truncateLegends: PropTypes.bool.isRequired
};
