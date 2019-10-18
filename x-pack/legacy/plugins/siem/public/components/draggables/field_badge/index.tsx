/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { rgba } from 'polished';
import * as React from 'react';
import { pure } from 'recompose';
import styled, { css } from 'styled-components';

const Field = styled.div`
  ${({ theme }) => css`
    background-color: ${theme.eui.euiColorEmptyShade};
    border: ${theme.eui.euiBorderThin};
    box-shadow: 0 2px 2px -1px ${rgba(theme.eui.euiColorMediumShade, 0.3)},
      0 1px 5px -2px ${rgba(theme.eui.euiColorMediumShade, 0.3)};
    font-size: ${theme.eui.euiFontSizeXS};
    font-weight: ${theme.eui.euiFontWeightSemiBold};
    line-height: ${theme.eui.euiLineHeight};
    padding: ${theme.eui.paddingSizes.xs};
  `}
`;
Field.displayName = 'Field';

/**
 * Renders a field (e.g. `event.action`) as a draggable badge
 */

// Passing the styles directly to the component because the width is
// being calculated and is recommended by Styled Components for performance
// https://github.com/styled-components/styled-components/issues/134#issuecomment-312415291
export const DraggableFieldBadge = pure<{ fieldId: string; fieldWidth?: string }>(
  ({ fieldId, fieldWidth }) => (
    <Field data-test-subj="field" style={{ width: fieldWidth }}>
      {fieldId}
    </Field>
  )
);
DraggableFieldBadge.displayName = 'DraggableFieldBadge';
