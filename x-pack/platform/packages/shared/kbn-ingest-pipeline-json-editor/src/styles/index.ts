/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiThemeComputed } from '@elastic/eui';
import { transparentize } from '@elastic/eui';
import { css, type SerializedStyles } from '@emotion/react';

interface EditorPanelStylesParams {
  height: string;
}

interface EditorContainerStylesParams {
  euiTheme: EuiThemeComputed;
  glyphSize: string;
  glyphMarginTop: string;
}

interface FocusedStepOutlineStylesParams {
  euiTheme: EuiThemeComputed;
  scrollbarWidth?: string;
}

const encodeSvg = (svg: string) => encodeURIComponent(svg);

export const successMask = `url('data:image/svg+xml,${encodeSvg(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12"><path d="M6 12A6 6 0 1 0 6 0a6 6 0 0 0 0 12Zm3.401-8.27a.562.562 0 0 1-.007.796l-3.818 3.75a.562.562 0 0 1-.788 0L2.606 6.133a.562.562 0 1 1 .788-.802l1.788 1.756 3.424-3.363a.562.562 0 0 1 .795.007Z"/></svg>`
)}')`;

export const failureMask = `url('data:image/svg+xml,${encodeSvg(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12"><path fill-rule="evenodd" clip-rule="evenodd" d="M8 0a.8.8 0 0 1 .566.234l3.2 3.2A.8.8 0 0 1 12 4v4a.8.8 0 0 1-.234.566l-3.2 3.2A.8.8 0 0 1 8 12H4a.8.8 0 0 1-.566-.234l-3.2-3.2A.8.8 0 0 1 0 8V4a.8.8 0 0 1 .234-.566l3.2-3.2A.8.8 0 0 1 4 0h4ZM3.317 3.317a.4.4 0 0 1 .566 0L6 5.434l2.117-2.117a.4.4 0 1 1 .566.566L6.566 6l2.117 2.117a.4.4 0 1 1-.566.566L6 6.566 3.883 8.683a.4.4 0 1 1-.566-.566L5.434 6 3.317 3.883a.4.4 0 0 1 0-.566Z"/></svg>`
)}')`;

export const infoMask = `url('data:image/svg+xml,${encodeSvg(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12"><path d="M6 0a6 6 0 1 1 0 12A6 6 0 0 1 6 0ZM4.5 5.14v.856h1.043L5.569 9h1.97v-.856h-.957L6.556 5.14H4.5ZM6.038 3c-.219 0-.387.066-.505.196a.711.711 0 0 0-.177.494c0 .195.06.357.177.486.118.129.286.194.505.194.22 0 .39-.065.509-.194a.687.687 0 0 0 .179-.486.705.705 0 0 0-.18-.494C6.428 3.066 6.258 3 6.039 3Z"/></svg>`
)}')`;

export const circleMask = `url('data:image/svg+xml,${encodeSvg(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12"><circle cx="6" cy="6" r="6"/></svg>`
)}')`;

export const getEditorPanelStyles = ({ height }: EditorPanelStylesParams): SerializedStyles => css`
  height: ${height};
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

export const getEditorContainerStyles = ({
  euiTheme,
  glyphSize,
  glyphMarginTop,
}: EditorContainerStylesParams): SerializedStyles => css`
  flex: 1;
  overflow: hidden;
  position: relative;

  .monaco-editor {
    height: 100% !important;
  }

  /* Ensure Monaco's overlay widgets (hover, errors, etc.) appear above step actions */
  .monaco-editor .overflowingContentWidgets,
  .monaco-editor .monaco-hover {
    z-index: 10 !important;
  }

  /* Simulation glyph marker styles */
  .ingest-pipeline-sim-glyph {
    width: ${glyphSize} !important;
    height: ${glyphSize} !important;
    margin-left: 0;
    margin-top: ${glyphMarginTop};
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }

  .ingest-pipeline-sim-glyph::after {
    content: '';
    width: ${glyphSize};
    height: ${glyphSize};
    background-color: currentColor;
    mask-repeat: no-repeat;
    -webkit-mask-repeat: no-repeat;
    mask-position: center;
    -webkit-mask-position: center;
    mask-size: contain;
    -webkit-mask-size: contain;
  }

  .ingest-pipeline-sim-glyph-success {
    color: ${euiTheme.colors.success};
  }

  .ingest-pipeline-sim-glyph-success::after {
    mask-image: ${successMask};
    -webkit-mask-image: ${successMask};
  }

  .ingest-pipeline-sim-glyph-failure {
    color: ${euiTheme.colors.danger};
  }

  .ingest-pipeline-sim-glyph-failure::after {
    mask-image: ${failureMask};
    -webkit-mask-image: ${failureMask};
  }

  .ingest-pipeline-sim-glyph-warning {
    color: ${euiTheme.colors.textWarning};
  }

  .ingest-pipeline-sim-glyph-warning::after {
    mask-image: ${infoMask};
    -webkit-mask-image: ${infoMask};
  }

  .ingest-pipeline-sim-glyph-skipped {
    color: ${euiTheme.colors.textWarning};
  }

  .ingest-pipeline-sim-glyph-skipped::after {
    mask-image: ${circleMask};
    -webkit-mask-image: ${circleMask};
  }

  .ingest-pipeline-sim-glyph-pending {
    color: ${euiTheme.colors.danger};
  }

  .ingest-pipeline-sim-glyph-pending::after {
    mask-image: ${circleMask};
    -webkit-mask-image: ${circleMask};
  }

  .ingest-pipeline-sim-glyph-disabled {
    color: ${euiTheme.colors.textSubdued};
  }

  .ingest-pipeline-sim-glyph-disabled::after {
    mask-image: ${circleMask};
    -webkit-mask-image: ${circleMask};
  }
`;

export const getStepDecorationsStyles = (euiTheme: EuiThemeComputed): SerializedStyles =>
  css({
    '.ingest-pipeline-step-execution-pending': {
      backgroundColor: 'transparent',
    },
    '.ingest-pipeline-step-execution-running': {
      backgroundColor: 'transparent',
    },
    '.ingest-pipeline-step-execution-success': {
      backgroundColor: transparentize(euiTheme.colors.backgroundLightSuccess, 0.5),
    },
    '.ingest-pipeline-step-execution-successWithWarnings': {
      backgroundColor: transparentize(euiTheme.colors.backgroundLightSuccess, 0.5),
    },
    '.ingest-pipeline-step-execution-failure': {
      backgroundColor: transparentize(euiTheme.colors.backgroundLightDanger, 0.5),
    },
    '.ingest-pipeline-step-execution-skipped': {
      backgroundColor: 'transparent',
    },
    '.ingest-pipeline-step-execution-disabled': {
      backgroundColor: transparentize(euiTheme.colors.lightShade, 0.5),
    },
  });

export const getStepActionsStyles = (euiTheme: EuiThemeComputed): SerializedStyles => css`
  position: absolute;
  right: 28px;
  z-index: 5;
  background: ${euiTheme.colors.emptyShade};
  border-radius: ${euiTheme.border.radius.medium};
  padding: ${euiTheme.size.xs} ${euiTheme.size.s};
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
`;

export const getFocusedStepOutlineStyles = ({
  euiTheme,
  scrollbarWidth = '24px',
}: FocusedStepOutlineStylesParams): SerializedStyles => {
  const borderColor = euiTheme.colors.primary;
  const base: Record<string, string | number> = {
    backgroundColor: 'transparent',
    borderLeft: `1px solid ${borderColor}`,
    borderRight: `1px solid ${borderColor}`,
    position: 'relative',
    width: `calc(100% - ${scrollbarWidth}) !important`,
  };

  return css({
    '.ingest-pipeline-step-selected-single': {
      ...base,
      borderTop: `1px solid ${borderColor}`,
      borderBottom: `1px solid ${borderColor}`,
      borderRadius: '4px',
    },
    '.ingest-pipeline-step-selected-first': {
      ...base,
      borderTop: `1px solid ${borderColor}`,
      borderBottom: 'none',
      borderTopLeftRadius: '4px',
      borderTopRightRadius: '4px',
    },
    '.ingest-pipeline-step-selected-middle': {
      ...base,
      borderTop: 'none',
      borderBottom: 'none',
    },
    '.ingest-pipeline-step-selected-last': {
      ...base,
      borderTop: 'none',
      borderBottom: `1px solid ${borderColor}`,
      borderBottomLeftRadius: '4px',
      borderBottomRightRadius: '4px',
    },
  });
};
