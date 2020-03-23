/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { rgba } from 'polished';
import React from 'react';
import styled from 'styled-components';

interface WidthProp {
  width?: number;
}

const Field = styled.div.attrs<WidthProp>(({ width }) => {
  if (width) {
    return {
      style: {
        width: `${width}px`,
      },
    };
  }
})<WidthProp>`
  background-color: ${({ theme }) => theme.eui.euiColorEmptyShade};
  border: ${({ theme }) => theme.eui.euiBorderThin};
  box-shadow: 0 2px 2px -1px ${({ theme }) => rgba(theme.eui.euiColorMediumShade, 0.3)},
    0 1px 5px -2px ${({ theme }) => rgba(theme.eui.euiColorMediumShade, 0.3)};
  font-size: ${({ theme }) => theme.eui.euiFontSizeXS};
  font-weight: ${({ theme }) => theme.eui.euiFontWeightSemiBold};
  line-height: ${({ theme }) => theme.eui.euiLineHeight};
  padding: ${({ theme }) => theme.eui.paddingSizes.xs};
`;
Field.displayName = 'Field';

/**
 * Renders a field (e.g. `event.action`) as a draggable badge
 */

export const DraggableFieldBadge = React.memo<{ fieldId: string; fieldWidth?: number }>(
  ({ fieldId, fieldWidth }) => (
    <Field data-test-subj="field" width={fieldWidth}>
      {fieldId}
    </Field>
  )
);

DraggableFieldBadge.displayName = 'DraggableFieldBadge';
