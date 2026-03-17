/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import type { UseEuiTheme } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiToolTip } from '@elastic/eui';
import { css } from '@emotion/react';
import type { Workspace } from '../../types';
import { gphSidebarHeaderStyles, gphSidebarPanelStyles } from '../../styles';
import { gphSidebarSectionSpacingStyles } from './control_plane.styles';

interface SelectStyleProps {
  workspace: Workspace;
  colors: string[];
}

export const SelectStyle = ({ colors, workspace }: SelectStyleProps) => {
  return (
    <div css={gphSidebarPanelStyles}>
      <div css={gphSidebarHeaderStyles}>
        <EuiIcon type="brush" size="s" aria-hidden={true} />{' '}
        {i18n.translate('xpack.graph.sidebar.styleVerticesTitle', {
          defaultMessage: 'Style selected vertices',
        })}
      </div>

      <EuiFlexGroup responsive={false} wrap gutterSize="xs" css={gphSidebarSectionSpacingStyles}>
        {colors.map((c) => {
          const onSelectColor = () => {
            workspace.colorSelected(c);
            workspace.changeHandler();
          };
          const applyColorButtonLabel = i18n.translate(
            'xpack.graph.sidebar.styleVertices.selectColorButtonLabel',
            {
              defaultMessage: 'Apply color {color}',
              values: { color: c },
            }
          );

          return (
            <EuiFlexItem grow={false} key={c}>
              <EuiToolTip content={applyColorButtonLabel}>
                <button
                  type="button"
                  css={colorPickerButtonStyles}
                  aria-label={applyColorButtonLabel}
                  onClick={onSelectColor}
                >
                  <EuiIcon
                    type="stopFilled"
                    color={c}
                    css={colorPickerIconStyles}
                    aria-hidden="true"
                  />
                </button>
              </EuiToolTip>
            </EuiFlexItem>
          );
        })}
      </EuiFlexGroup>
    </div>
  );
};

const colorPickerButtonStyles = ({ euiTheme }: UseEuiTheme) =>
  css({
    alignItems: 'center',
    background: 'transparent',
    border: euiTheme.border.thin,
    borderRadius: euiTheme.border.radius.small,
    cursor: 'pointer',
    display: 'inline-flex',
    justifyContent: 'center',
    padding: euiTheme.size.xs,

    '&:hover, &:focus': {
      backgroundColor: euiTheme.colors.lightestShade,
      borderColor: euiTheme.colors.primary,
    },
  });

const colorPickerIconStyles = ({ euiTheme }: UseEuiTheme) =>
  css({
    margin: 0,

    '&:hover, &:focus': {
      transform: 'scale(1.4)',
    },
  });
