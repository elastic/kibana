/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useEffect } from 'react';

import { Page } from './components';
import { useExpressionsActions, useExpressions } from './hooks';

interface Props {
  encodedExpression?: string;
}

export const ElementBuilder: FC<Props> = ({ encodedExpression = '' }) => {
  const { setExpression } = useExpressionsActions();

  useEffect(() => {
    if (encodedExpression) {
      try {
        const decoded = atob(encodedExpression);
        setExpression(decoded);
      } catch (e) {
        // no-op
      }
    }
  }, []);

  return (
    <div className="canvasLayout">
      <div className="canvasLayout__rows">
        <Page />
      </div>
    </div>
  );
};
