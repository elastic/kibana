/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { css, keyframes } from '@emotion/css';
import type {
  Datatable,
  ExpressionFunctionDefinition,
  ExpressionRenderDefinition,
  IInterpreterRenderHandlers,
} from '../../../../src/plugins/expressions/public';
import { RotatingNumberState } from '../common/types';
import { FormatFactory } from '../../../../src/plugins/field_formats/common';

export const getRotatingNumberRenderer = (
  formatFactory: Promise<FormatFactory>
): ExpressionRenderDefinition<RotatingNumberChartProps> => ({
  name: 'rotating_number',
  displayName: 'Rotating number',
  help: 'Rotating number renderer',
  validate: () => undefined,
  reuseDomNode: true,
  render: async (
    domNode: Element,
    config: RotatingNumberChartProps,
    handlers: IInterpreterRenderHandlers
  ) => {
    ReactDOM.render(
      <RotatingNumberChart {...config} formatFactory={await formatFactory} />,
      domNode,
      () => {
        handlers.done();
      }
    );
    handlers.onDestroy(() => ReactDOM.unmountComponentAtNode(domNode));
  },
});

const rotating = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`;

function RotatingNumberChart({
  data,
  args,
  formatFactory,
}: RotatingNumberChartProps & { formatFactory: FormatFactory }) {
  const { accessor, color } = args;
  const column = data.columns.find((col) => col.id === accessor);
  const rawValue = accessor && data.rows[0]?.[accessor];

  const value =
    column && column.meta?.params
      ? formatFactory(column.meta?.params).convert(rawValue)
      : Number(Number(rawValue).toFixed(3)).toString();

  return (
    <div
      className={css`
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        width: 100%;
        height: 100%;
        text-align: center;
        font-size: 100px;
        overflow: hidden;
      `}
    >
      <div
        className={css`
          color: ${color};
          animation: ${rotating} 5s linear infinite;
        `}
      >
        {value}
      </div>
    </div>
  );
}
export interface RotatingNumberChartProps {
  data: Datatable;
  args: RotatingNumberState;
}

interface RotatingNumberRender {
  type: 'render';
  as: 'rotating_number';
  value: RotatingNumberChartProps;
}

export const rotatingNumberFunction: ExpressionFunctionDefinition<
  'rotating_number',
  Datatable,
  Omit<RotatingNumberState, 'layerId' | 'layerType'>,
  RotatingNumberRender
> = {
  name: 'rotating_number',
  type: 'render',
  help: 'A rotating number',
  args: {
    accessor: {
      types: ['string'],
      help: 'The column whose value is being displayed',
    },
    color: {
      types: ['string'],
      help: 'Color of the number',
    },
  },
  inputTypes: ['datatable'],
  fn(data, args) {
    return {
      type: 'render',
      as: 'rotating_number',
      value: {
        data,
        args,
      },
    } as RotatingNumberRender;
  },
};
