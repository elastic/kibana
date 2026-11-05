/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import type { UseEuiTheme } from '@elastic/eui';

/**
 * Temporary override so the flyout menu row matches the 48px compact app header. Like the header, the
 * 48px (EUI's `size.s` block padding included) excludes the bottom border, whose rendered width varies
 * with browser zoom, so both borders land on the same line at any zoom level. EUI has no prop for
 * the row height, its controls group only spans its content height (so it's stretched to re-centre the
 * actions), and the close button is absolutely positioned outside that group, so it's re-centred
 * separately. Remove once EUI supports a configurable menu row height.
 */
export const flyoutMenuRowStyles = ({ euiTheme }: UseEuiTheme) => {
  const rowHeight = euiTheme.size.xxxl;
  const closeButtonHeight = euiTheme.size.l;

  return css`
    .euiFlyoutMenu {
      box-sizing: content-box;
      block-size: calc(${rowHeight} - 2 * ${euiTheme.size.s});
    }

    .euiFlyoutMenu > .euiFlexGroup {
      block-size: 100%;
    }

    .euiFlyoutMenu .euiFlyout__closeButton {
      inset-block-start: calc((${rowHeight} - ${closeButtonHeight}) / 2);
    }
  `;
};
