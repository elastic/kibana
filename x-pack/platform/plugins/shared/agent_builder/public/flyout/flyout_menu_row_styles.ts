/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import type { UseEuiTheme } from '@elastic/eui';

/**
 * Temporary override so the flyout menu row matches the 48px compact app header. EUI has no prop for
 * the row height, its controls group only spans its content height (so it's stretched to re-centre the
 * actions), and the close button is absolutely positioned outside that group, so it's re-centred
 * separately. Remove once EUI supports a configurable menu row height.
 */
export const flyoutMenuRowStyles = ({ euiTheme }: UseEuiTheme) => {
  const rowHeight = euiTheme.size.xxxl;
  const closeButtonHeight = euiTheme.size.l;

  return css`
    .euiFlyoutMenu {
      block-size: ${rowHeight};
    }

    .euiFlyoutMenu > .euiFlexGroup {
      block-size: 100%;
    }

    .euiFlyoutMenu .euiFlyout__closeButton {
      inset-block-start: calc(
        (${rowHeight} - ${euiTheme.border.width.thin} - ${closeButtonHeight}) / 2
      );
    }
  `;
};
