/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import type { EuiThemeComputed } from '@elastic/eui';

export const INLINE_FIELD_RENAME_FORM_CONTAINER_NAME = 'inlineFieldRenameForm';

export const INLINE_FIELD_TYPE_WIDTH_PX = 213;

export const INLINE_FIELD_RENAME_BREAKPOINT_MEDIUM_PX = 800;

export const INLINE_FIELD_RENAME_BREAKPOINT_NARROW_PX = 480;

export const getInlineFieldRenameFormContainerCss = () => css`
  container-type: inline-size;
  container-name: ${INLINE_FIELD_RENAME_FORM_CONTAINER_NAME};
  width: 100%;
`;

const narrowColumnClusterCss = css`
  @container ${INLINE_FIELD_RENAME_FORM_CONTAINER_NAME} (max-width: ${INLINE_FIELD_RENAME_BREAKPOINT_NARROW_PX}px) {
    .euiFlexGroup {
      flex-direction: column;
    }

    .euiFlexItem {
      width: 100%;
    }
  }
`;

export const getInlineFieldRenameFormRowCss = () => css`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: var(--inlineFieldRenameRowGap);
  width: 100%;
`;

export const getInlineFieldRenameTypeClusterCss = () => css`
  display: flex;
  flex: 0 1 auto;
  min-width: 0;

  @container ${INLINE_FIELD_RENAME_FORM_CONTAINER_NAME} (max-width: ${INLINE_FIELD_RENAME_BREAKPOINT_MEDIUM_PX}px) {
    flex: 1 1 100%;
  }

  ${narrowColumnClusterCss}
`;

export const getInlineFieldRenameIdentityClusterCss = () => css`
  display: flex;
  flex: 1 1 0;
  min-width: 0;

  @container ${INLINE_FIELD_RENAME_FORM_CONTAINER_NAME} (max-width: ${INLINE_FIELD_RENAME_BREAKPOINT_MEDIUM_PX}px) {
    flex: 1 1 100%;
  }

  ${narrowColumnClusterCss}
`;

export const getInlineFieldRenameTypeFieldCss = () => css`
  flex: 0 0 auto;
  width: ${INLINE_FIELD_TYPE_WIDTH_PX}px;
  max-width: 100%;

  .euiComboBox,
  .euiFormControlLayout {
    width: 100%;
  }

  @container ${INLINE_FIELD_RENAME_FORM_CONTAINER_NAME} (max-width: ${INLINE_FIELD_RENAME_BREAKPOINT_NARROW_PX}px) {
    flex: 1 1 auto;
    width: 100%;
  }
`;

export const getInlineFieldRenameFormRowGapCss = ({
  euiTheme,
}: {
  euiTheme: EuiThemeComputed;
}) => css`
  --inlineFieldRenameRowGap: ${euiTheme.size.s};
`;
