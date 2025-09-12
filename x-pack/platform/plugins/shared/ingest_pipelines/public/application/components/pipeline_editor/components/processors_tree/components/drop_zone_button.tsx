/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { FunctionComponent } from 'react';
import React from 'react';
import { EuiButtonIcon, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

export interface Props {
  isVisible: boolean;
  isDisabled: boolean;
  /**
   * Useful for buttons at the very top or bottom of lists to avoid any overflow.
   */
  compressed?: boolean;
  onClick: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
  'data-test-subj'?: string;
}

const moveHereLabel = i18n.translate(
  'xpack.ingestPipelines.pipelineEditor.dropZoneButton.moveHereToolTip',
  {
    defaultMessage: 'Move here',
  }
);

const cannotMoveHereLabel = i18n.translate(
  'xpack.ingestPipelines.pipelineEditor.dropZoneButton.unavailableToolTip',
  { defaultMessage: 'Cannot move here' }
);

const dropZoneButtonHeight = 60;
const dropZoneButtonOffsetY = dropZoneButtonHeight * 0.5;

const useStyles = ({
  isVisible,
  isUnavailable,
  compressed,
}: {
  isVisible: boolean;
  isUnavailable: boolean;
  compressed?: boolean;
}) => {
  const { euiTheme } = useEuiTheme();

  return {
    container: css`
      position: relative;
      margin: 2px;
      visibility: hidden;
      background-color: transparent;
      height: 2px;
      ${isVisible &&
      css`
        visibility: visible;
        &:hover {
          background-color: ${isUnavailable
            ? euiTheme.colors.mediumShade
            : euiTheme.colors.primary};
        }
      `}
    `,
    button: css`
      position: absolute;
      padding: 0;
      height: ${compressed ? dropZoneButtonOffsetY : dropZoneButtonHeight}px;
      margin-top: -${dropZoneButtonOffsetY}px;
      width: 100%;
      text-decoration: none !important;
      z-index: ${euiTheme.levels.flyout};
      ${isVisible &&
      css`
        pointer-events: visible !important;
        &:hover {
          transform: none !important;
        }
      `}
    `,
  };
};

export const DropZoneButton: FunctionComponent<Props> = (props) => {
  const { onClick, isDisabled, isVisible, compressed } = props;
  const isUnavailable = isVisible && isDisabled;
  const styles = useStyles({ isVisible, isUnavailable, compressed });

  return (
    <div css={styles.container}>
      <EuiButtonIcon
        data-test-subj={props['data-test-subj']}
        css={styles.button}
        aria-label={isUnavailable ? cannotMoveHereLabel : moveHereLabel}
        // We artificially disable the button so that hover and pointer events are
        // still enabled
        onClick={isDisabled ? () => {} : onClick}
        iconType="empty"
      />
    </div>
  );
};
