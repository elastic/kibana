/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiText } from '@elastic/eui';
import euiStyled from '../../../../../../../../common/eui_styled_components';

export const StepText = euiStyled(EuiText).attrs({ size: 's' })`
  & .euiButtonEmpty {
    font-size: inherit;
    line-height: inherit;
    height: initial;
  }

  & .euiButtonEmpty__content {
    padding: 0;
  }
`;
