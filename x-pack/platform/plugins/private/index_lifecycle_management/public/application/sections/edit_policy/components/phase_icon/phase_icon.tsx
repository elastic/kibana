/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React from 'react';
import { css } from '@emotion/react';
import { EuiIcon, makeHighContrastColor, useEuiTheme, useIsDarkMode } from '@elastic/eui';
import { usePhaseColors } from '@kbn/data-lifecycle-phases';
import type { Phases } from '../../../../../../common/types';

const getPhaseIconForegroundColor = (
  backgroundColor: string,
  euiTheme: ReturnType<typeof useEuiTheme>['euiTheme'],
  isDarkMode: boolean,
  phase: string
) => {
  if (phase === 'delete') {
    return euiTheme.colors.backgroundFilledText;
  }

  const foregroundColor = isDarkMode ? euiTheme.colors.plainLight : euiTheme.colors.plainDark;

  return makeHighContrastColor(foregroundColor)(backgroundColor);
};

const useStyles = ({ enabled, phase }: { enabled: boolean; phase: string }) => {
  const { euiTheme } = useEuiTheme();
  const isDarkMode = useIsDarkMode();
  const phaseIconColors = usePhaseColors();
  const backgroundColor = enabled
    ? phaseIconColors[phase as keyof typeof phaseIconColors]
    : euiTheme.colors.backgroundBaseFormsPrepend;

  return {
    container: css`
      width: ${enabled ? euiTheme.size.xl : euiTheme.size.base};
      height: ${enabled ? euiTheme.size.xl : euiTheme.size.base};
      display: flex;
      justify-content: center;
      align-items: center;
      border-radius: 50%;
      background-color: ${backgroundColor};
      ${enabled
        ? `color: ${getPhaseIconForegroundColor(backgroundColor, euiTheme, isDarkMode, phase)};`
        : ''}
      ${!enabled && `margin: ${euiTheme.size.s};`}
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
        <EuiIcon type={phase === 'delete' ? 'trash' : 'check'} aria-hidden={true} />
      ) : (
        <EuiIcon type={'dot'} size={'s'} aria-hidden={true} />
      )}
    </div>
  );
};
