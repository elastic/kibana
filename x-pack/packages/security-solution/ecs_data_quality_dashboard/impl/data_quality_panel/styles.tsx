/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCode } from '@elastic/eui';
import { euiThemeVars } from '@kbn/ui-theme';

import styled from 'styled-components';

export const CodeDanger = styled(EuiCode)`
  color: ${euiThemeVars.euiColorDanger};
`;

export const CodeSuccess = styled(EuiCode)`
  color: ${euiThemeVars.euiColorSuccess};
`;

export const CodeWarning = styled(EuiCode)`
  color: ${euiThemeVars.euiColorWarning};
`;
