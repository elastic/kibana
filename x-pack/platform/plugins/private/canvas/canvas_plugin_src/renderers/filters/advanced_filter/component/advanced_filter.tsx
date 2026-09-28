/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import { EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const strings = {
  getApplyButtonLabel: () =>
    i18n.translate('xpack.canvas.renderer.advancedFilter.applyButtonLabel', {
      defaultMessage: 'Apply',
      description: 'This refers to applying the filter to the Canvas workpad',
    }),
  getInputPlaceholder: () =>
    i18n.translate('xpack.canvas.renderer.advancedFilter.inputPlaceholder', {
      defaultMessage: 'Enter filter expression',
    }),
};

export interface Props {
  /** Optional value for the component */
  value?: string;
  /** Function to invoke when the filter value is changed */
  onChange: (value: string) => void;
  /** Function to invoke when the filter value is committed */
  commit: (value: string) => void;
}

export const AdvancedFilter: FunctionComponent<Props> = ({ value = '', onChange, commit }) => {
  const { euiTheme } = useEuiTheme();
  const styles = useMemo(
    () => css`
      & .canvasAdvancedFilter__input {
        background-color: ${euiTheme.colors.emptyShade};
        border: ${euiTheme.border.thin};
      }

      & .canvasAdvancedFilter__button {
        border: ${euiTheme.border.thin};
        background-color: ${euiTheme.colors.emptyShade};

        &:hover {
          background-color: ${euiTheme.colors.lightestShade};
        }
      }
    `,
    [euiTheme]
  );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        commit(value);
      }}
      className="canvasAdvancedFilter"
      css={styles}
    >
      <EuiFlexGroup gutterSize="xs">
        <EuiFlexItem>
          <input
            type="text"
            className="canvasAdvancedFilter__input"
            placeholder={strings.getInputPlaceholder()}
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <button className="canvasAdvancedFilter__button" type="submit">
            {strings.getApplyButtonLabel()}
          </button>
        </EuiFlexItem>
      </EuiFlexGroup>
    </form>
  );
};
