/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';
import { css } from '@emotion/react';
import { EuiIcon, useEuiTheme } from '@elastic/eui';
import { Phases } from '../../../../../../common/types';
import './phase_icon.scss';
interface Props {
  enabled: boolean;
  phase: string & keyof Phases;
}
export const PhaseIcon: FunctionComponent<Props> = ({ enabled, phase }) => {
  const { euiTheme } = useEuiTheme();

  const isBorealis = euiTheme.themeName === 'EUI_THEME_BOREALIS';

  const phaseIconColors = {
    hot: isBorealis ? euiTheme.colors.vis.euiColorVis6 : euiTheme.colors.vis.euiColorVisBehindText9,
    warm: isBorealis
      ? euiTheme.colors.vis.euiColorVis9
      : euiTheme.colors.vis.euiColorVisBehindText5,
    cold: isBorealis
      ? euiTheme.colors.vis.euiColorVis2
      : euiTheme.colors.vis.euiColorVisBehindText1,
    frozen: isBorealis
      ? euiTheme.colors.vis.euiColorVis4
      : euiTheme.colors.vis.euiColorVisBehindText4,
    delete: euiTheme.colors.darkShade,
  };

  return (
    <div
      className={`ilmPhaseIcon ilmPhaseIcon--${phase} ${enabled ? '' : 'ilmPhaseIcon--disabled'}`}
    >
      {enabled ? (
        <EuiIcon
          css={css`
            fill: ${phaseIconColors[phase]};
          `}
          type={phase === 'delete' ? 'trash' : 'checkInCircleFilled'}
          size={phase === 'delete' ? 'm' : 'l'}
        />
      ) : (
        <EuiIcon className="ilmPhaseIcon__inner--disabled" type={'dot'} size={'s'} />
      )}
    </div>
  );
};
