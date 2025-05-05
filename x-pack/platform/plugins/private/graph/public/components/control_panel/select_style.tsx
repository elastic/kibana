/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiIcon, UseEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { Workspace } from '../../types';
import { gphSidebarHeaderStyles, gphSidebarPanelStyles } from '../../styles';
import { gphFormGroupSmallStyles } from './control_plane.styles';

interface SelectStyleProps {
  workspace: Workspace;
  colors: string[];
}

export const SelectStyle = ({ colors, workspace }: SelectStyleProps) => {
  return (
    <div css={gphSidebarPanelStyles}>
      <div css={gphSidebarHeaderStyles}>
        <EuiIcon type="brush" size="s" />{' '}
        {i18n.translate('xpack.graph.sidebar.styleVerticesTitle', {
          defaultMessage: 'Style selected vertices',
        })}
      </div>

      <div className="form-group form-group-sm" css={gphFormGroupSmallStyles}>
        {colors.map((c) => {
          const onSelectColor = () => {
            workspace.colorSelected(c);
            workspace.changeHandler();
          };
          return (
            <EuiIcon
              type="stopFilled"
              color={c}
              css={colorPickerIconStyles}
              aria-hidden="true"
              onClick={onSelectColor}
            />
          );
        })}
      </div>
    </div>
  );
};

const colorPickerIconStyles = ({ euiTheme }: UseEuiTheme) =>
  css({
    margin: euiTheme.size.xs,
    cursor: 'pointer',

    '&:hover, &:focus': {
      transform: 'scale(1.4)',
    },
  });
