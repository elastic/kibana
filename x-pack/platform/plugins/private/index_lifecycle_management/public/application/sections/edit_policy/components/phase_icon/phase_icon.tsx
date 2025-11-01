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
import { getPhaseColors } from '../../../../lib';

const useStyles = ({ enabled, phase }: { enabled: boolean; phase: string }) => {
  const { euiTheme } = useEuiTheme();

  const phaseIconColors = getPhaseColors(euiTheme);

  return {
    container: css`
      width: ${enabled ? euiTheme.size.xl : euiTheme.size.base};
      height: ${enabled ? euiTheme.size.xl : euiTheme.size.base};
      display: flex;
      justify-content: center;
      align-items: center;
      border-radius: 50%;
      background-color: ${!enabled
        ? euiTheme.colors.backgroundBaseFormsPrepend
        : phaseIconColors[phase as keyof typeof phaseIconColors]};
      ${!enabled && `margin: ${euiTheme.size.s};`}
    `,
    icon:
      phase === 'delete'
        ? euiTheme.colors.backgroundFilledText
        : euiTheme.colors.backgroundBasePlain,
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
        <EuiIcon color={styles.icon} type={phase === 'delete' ? 'trash' : 'check'} />
      ) : (
        <EuiIcon type={'dot'} size={'s'} />
      )}
    </div>
  );
};
