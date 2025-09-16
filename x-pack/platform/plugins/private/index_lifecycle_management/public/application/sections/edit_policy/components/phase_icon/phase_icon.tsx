/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React from 'react';
import { css } from '@emotion/react';
import { EuiIcon, useEuiTheme } from '@elastic/eui';
import type { Phases } from '../../../../../../common/types';

const useStyles = ({ enabled, phase }: { enabled: boolean; phase: string }) => {
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

  return {
    container: css`
      width: ${enabled ? euiTheme.size.xl : euiTheme.size.base};
      height: ${enabled ? euiTheme.size.xl : euiTheme.size.base};
      display: flex;
      justify-content: center;
      align-items: center;
      border-radius: 50%;
      background-color: ${phase === 'delete'
        ? euiTheme.colors.lightShade
        : euiTheme.colors.lightestShade};
      ${!enabled && `margin: ${euiTheme.size.s};`}
    `,
    icon: css`
      fill: ${phaseIconColors[phase as keyof typeof phaseIconColors]};
    `,
  };
};
interface Props {
  enabled: boolean;
  phase: string & keyof Phases;
}
export const PhaseIcon: FunctionComponent<Props> = ({ enabled, phase }) => {
  const styles = useStyles({ enabled, phase });

  return (
    <div css={styles.container}>
      {enabled ? (
        <EuiIcon
          css={styles.icon}
          type={phase === 'delete' ? 'trash' : 'checkInCircleFilled'}
          size={phase === 'delete' ? 'm' : 'l'}
        />
      ) : (
        <EuiIcon type={'dot'} size={'s'} />
      )}
    </div>
  );
};
