/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';

import { EuiCode } from '@elastic/eui';

import { ExpressionRendererComponent } from 'src/plugins/expressions';
import { useExpressions } from '../hooks';

const LIMIT = 500;

export const Output: FC = () => {
  const { ast, result, expression } = useExpressions();
  let render = null;

  if (ast && result) {
    render = (
      <ExpressionRendererComponent
        expression={expression}
        onRenderError={(element, error) => console.log(error)}
        extraHandlers={{
          // done: () => {},
          // onDestroy: () => {},
          onResize: () => {},
          // setFilter: () => {},
          // getFilter: () => '',
        }}
      />
    );
  }
  return (
    <div>
      <p>
        <EuiCode language="json">{JSON.stringify(ast).substring(0, LIMIT)}</EuiCode>
      </p>
      <p>
        <EuiCode language="json">{JSON.stringify(result).substring(0, LIMIT)}</EuiCode>
      </p>
      {render}
    </div>
  );
};
