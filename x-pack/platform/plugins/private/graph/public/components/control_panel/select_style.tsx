/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useDispatch } from 'react-redux';
import { i18n } from '@kbn/i18n';
import type { UseEuiTheme } from '@elastic/eui';
import { EuiIcon } from '@elastic/eui';
import { css } from '@emotion/react';
import { gphSidebarHeaderStyles, gphSidebarPanelStyles } from '../../styles';
import { colorSelectedNodes, type GraphDispatch } from '../../state_management';
import { gphFormGroupSmallStyles } from './control_plane.styles';

interface SelectStyleProps {
  colors: string[];
}

export const SelectStyle = ({ colors }: SelectStyleProps) => {
  const dispatch = useDispatch<GraphDispatch>();

  return (
    <div css={gphSidebarPanelStyles}>
      <div css={gphSidebarHeaderStyles}>
        <EuiIcon type="brush" size="s" aria-hidden={true} />{' '}
        {i18n.translate('xpack.graph.sidebar.styleVerticesTitle', {
          defaultMessage: 'Style selected vertices',
        })}
      </div>

      <div className="form-group form-group-sm" css={gphFormGroupSmallStyles}>
        {colors.map((c) => {
          const onSelectColor = () => dispatch(colorSelectedNodes(c));
          return (
            <EuiIcon
              type="stopFill"
              color={c}
              css={colorPickerIconStyles}
              aria-label={i18n.translate('xpack.graph.sidebar.selectVertexColorAriaLabel', {
                defaultMessage: 'Set selected vertices color to {color}',
                values: { color: c },
              })}
              data-test-subj={`graphColorPicker-${c}`}
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
