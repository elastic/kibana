/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';

import euiStyled from '../../../../../common/eui_styled_components';
import { WithWaffleOptions } from '../../containers/waffle/with_waffle_options';
import { InfraFormatter, InfraWaffleMapBounds, InfraWaffleMapLegend } from '../../lib/lib';
import { GradientLegend } from './gradient_legend';
import { LegendControls } from './legend_controls';
import { isInfraWaffleMapGradientLegend, isInfraWaffleMapStepLegend } from './lib/type_guards';
import { StepLegend } from './steps_legend';
interface Props {
  legend: InfraWaffleMapLegend;
  bounds: InfraWaffleMapBounds;
  dataBounds: InfraWaffleMapBounds;
  formatter: InfraFormatter;
}

interface LegendControlOptions {
  auto: boolean;
  bounds: InfraWaffleMapBounds;
}

export const Legend: React.FC<Props> = ({ dataBounds, legend, bounds, formatter }) => {
  return (
    <LegendContainer>
      <WithWaffleOptions>
        {({ changeBoundsOverride, changeAutoBounds, autoBounds, boundsOverride }) => (
          <LegendControls
            dataBounds={dataBounds}
            bounds={bounds}
            autoBounds={autoBounds}
            boundsOverride={boundsOverride}
            onChange={(options: LegendControlOptions) => {
              changeBoundsOverride(options.bounds);
              changeAutoBounds(options.auto);
            }}
          />
        )}
      </WithWaffleOptions>
      {isInfraWaffleMapGradientLegend(legend) && (
        <GradientLegend formatter={formatter} legend={legend} bounds={bounds} />
      )}
      {isInfraWaffleMapStepLegend(legend) && <StepLegend formatter={formatter} legend={legend} />}
    </LegendContainer>
  );
};

const LegendContainer = euiStyled.div`
  position: absolute;
  bottom: 10px;
  left: 10px;
  right: 10px;
`;
