/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React from 'react';
import PropTypes from 'prop-types';
import { i18n } from '@kbn/i18n';

const strings = {
  getUnknownArgumentTypeErrorMessage: (expressionType: string) =>
    i18n.translate('xpack.canvas.functionForm.functionUnknown.unknownArgumentTypeError', {
      defaultMessage: 'Unknown expression type "{expressionType}"',
      values: {
        expressionType,
      },
    }),
};

interface Props {
  /** the type of the argument */
  argType: string;
}

export const FunctionUnknown: FunctionComponent<Props> = ({ argType }) => (
  <div className="canvasFunctionForm canvasFunctionForm--unknown-expression">
    {strings.getUnknownArgumentTypeErrorMessage(argType)}
  </div>
);

FunctionUnknown.propTypes = {
  // @ts-expect-error upgrade typescript v5.9.3
  argType: PropTypes.string,
};
