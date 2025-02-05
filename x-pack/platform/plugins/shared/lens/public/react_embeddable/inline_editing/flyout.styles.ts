/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UseEuiTheme } from '@elastic/eui';

// styles needed to display extra drop targets that are outside of the config panel main area while also allowing to scroll vertically
export const InlineFlyoutStyles = ({ euiTheme }: UseEuiTheme) => `
  clip-path: polygon(-100% 0, 100% 0, 100% 100%, -100% 100%);
  max-inline-size: 640px;
  min-inline-size: 256px;
  background:${euiTheme.colors.backgroundBaseSubdued};
  @include euiBreakpoint('xs', 's', 'm') {
    clip-path: none;
  }
  .kbnOverlayMountWrapper {
    padding-left: 400px;
    margin-left: -400px;
    pointer-events: none;
    .euiFlyoutFooter {
      pointer-events: auto;
    }
  }
`;

export const InlineFlyoutFlyoutBodyStyles = ({ euiTheme }: UseEuiTheme) => `
// styles needed to display extra drop targets that are outside of the config panel main area
overflow-y: auto;
padding-left: 400px;
margin-left: -400px;
pointer-events: none;
.euiFlyoutBody__overflow {
transform: initial;
-webkit-mask-image: none;
padding-left: inherit;
margin-left: inherit;
${!isScrollable && `overflow-y: hidden;`}
> * {
pointer-events: auto;
}
}
.euiFlyoutBody__overflowContent {
padding: 0;
block-size: 100%;
}
`;
