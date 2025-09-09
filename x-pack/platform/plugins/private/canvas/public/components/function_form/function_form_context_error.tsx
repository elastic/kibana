/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React from 'react';
import { i18n } from '@kbn/i18n';
import type { ExpressionContext } from '../../../types';

const strings = {
  getContextErrorMessage: (errorMessage: string | null = '') =>
    i18n.translate('xpack.canvas.functionForm.contextError', {
      defaultMessage: 'ERROR: {errorMessage}',
      values: {
        errorMessage,
      },
    }),
};
interface FunctionFormContextErrorProps {
  context: ExpressionContext;
}

export const FunctionFormContextError: FunctionComponent<FunctionFormContextErrorProps> = ({
  context,
}) => (
  <div className="canvasFunctionForm canvasFunctionForm--error">
    {strings.getContextErrorMessage(context.error)}
  </div>
);
