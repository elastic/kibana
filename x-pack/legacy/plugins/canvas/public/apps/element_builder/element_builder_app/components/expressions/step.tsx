/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { AnyExpressionFunction } from 'src/plugins/expressions/common';
import { InterpreterResult, isInterpreterResult } from 'src/plugins/expressions/public';

interface Props {
  fn: AnyExpressionFunction;
  args: { [key: string]: InterpreterResult | any };
  type?: 'li' | 'span';
}

export const InterpreterStep: FC<Props> = ({ fn, args, type = 'li' }) => {
  const { name } = fn;
  const isMany = args.length > 1;
  const Node = isMany ? 'ol' : 'div';
  const Item = isMany ? 'li' : 'span';
  const Type = type;

  const list = Object.keys(args).map((argName, index) => {
    const arg = args[argName];
    if (isInterpreterResult(arg)) {
      return (
        <Item key={'item_' + index}>
          {argName}: <InterpreterStep type={isMany ? 'li' : 'span'} fn={arg.fn} args={arg.args} />
        </Item>
      );
    }
    return (
      <Item key={'item_' + index}>
        {argName}: {arg}
      </Item>
    );
  });

  return (
    <Type>
      {name}
      <Node style={{ marginLeft: '12px' }}>{list}</Node>
    </Type>
  );
};
