/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, ReactEventHandler } from 'react';
import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import {
  EuiDescriptionList,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
  useEuiTheme,
} from '@elastic/eui';

interface Props {
  displayName: string;
  help: string;
  onValueAdd?: ReactEventHandler;
}

export const ArgAdd: FC<Props> = ({ onValueAdd = () => {}, displayName, help }) => {
  const { euiTheme } = useEuiTheme();
  const styles = useMemo(
    () => css`
      &:not(:last-child) {
        border-bottom: ${euiTheme.border.thin};
      }

      &:hover {
        background-color: ${euiTheme.colors.lightestShade};

        label {
          color: ${euiTheme.colors.darkestShade};
        }
      }
    `,
    [euiTheme]
  );

  return (
    <button className="canvasArg__add" css={styles} onClick={onValueAdd}>
      <EuiDescriptionList compressed>
        <EuiDescriptionListTitle>{displayName}</EuiDescriptionListTitle>
        <EuiDescriptionListDescription>
          <small>{help}</small>
        </EuiDescriptionListDescription>
      </EuiDescriptionList>
    </button>
  );
};
