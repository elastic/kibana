/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Ref } from 'react';
import { ShapeProps, SvgConfig, SvgElementTypes, ViewBoxParams, ParentNodeParams } from './types';

export function viewBoxToString(viewBox?: ViewBoxParams): undefined | string {
  if (!viewBox) {
    return;
  }

  return `${viewBox?.minX} ${viewBox?.minY} ${viewBox?.width} ${viewBox?.height}`;
}

function getMinxAndWidth(viewBoxParams: ViewBoxParams, { borderOffset, width }: ParentNodeParams) {
  let { minX, width: shapeWidth } = viewBoxParams;
  if (width) {
    const xOffset = (shapeWidth / width) * borderOffset;
    minX -= xOffset;
    shapeWidth += xOffset * 2;
  } else {
    shapeWidth = 0;
  }

  return [minX, shapeWidth];
}

function getMinyAndHeight(
  viewBoxParams: ViewBoxParams,
  { borderOffset, height }: ParentNodeParams
) {
  let { minY, height: shapeHeight } = viewBoxParams;
  if (height) {
    const yOffset = (shapeHeight / height) * borderOffset;
    minY -= yOffset;
    shapeHeight += yOffset * 2;
  } else {
    shapeHeight = 0;
  }

  return [minY, shapeHeight];
}

export function getViewBox(
  viewBoxParams: ViewBoxParams,
  parentNodeParams: ParentNodeParams
): ViewBoxParams {
  const [minX, width] = getMinxAndWidth(viewBoxParams, parentNodeParams);
  const [minY, height] = getMinyAndHeight(viewBoxParams, parentNodeParams);
  return { minX, minY, width, height };
}

export const getShapeComponent = (svgParams: SvgConfig) =>
  function Shape({
    shapeAttributes,
    shapeContentAttributes,
    children,
    textAttributes,
  }: React.PropsWithChildren<ShapeProps>) {
    const {
      viewBox: initialViewBox,
      shapeProps: defaultShapeContentAttributes,
      textAttributes: defaultTextAttributes,
      shapeType,
    } = svgParams;

    const viewBox = shapeAttributes?.viewBox
      ? viewBoxToString(shapeAttributes?.viewBox)
      : viewBoxToString(initialViewBox);

    const SvgContentElement = getShapeContentElement(shapeType);

    const TextElement = textAttributes
      ? React.forwardRef<SVGTextElement>((props, ref) => <text {...props} ref={ref} />)
      : null;

    return (
      <svg xmlns="http://www.w3.org/2000/svg" {...{ ...(shapeAttributes || {}), viewBox }}>
        <SvgContentElement
          {...{ ...defaultShapeContentAttributes, ...(shapeContentAttributes || {}) }}
        />
        {children}
        {TextElement && (
          <TextElement {...{ ...(defaultTextAttributes || {}), ...(textAttributes || {}) }}>
            {textAttributes?.textContent}
          </TextElement>
        )}
      </svg>
    );
  };

export function getShapeContentElement(type?: SvgElementTypes) {
  switch (type) {
    case SvgElementTypes.circle:
      return React.forwardRef<SVGCircleElement | null>((props, ref) => (
        <circle {...props} ref={ref} />
      ));
    case SvgElementTypes.rect:
      return React.forwardRef<SVGRectElement | null>((props, ref) => <rect {...props} ref={ref} />);
    case SvgElementTypes.path:
      return React.forwardRef<SVGPathElement | null>((props, ref) => <path {...props} ref={ref} />);
    default:
      return React.forwardRef<SVGPolygonElement | null>((props, ref) => (
        <polygon {...props} ref={ref} />
      ));
  }
}

export const createShape = (props: SvgConfig) => {
  return {
    Component: getShapeComponent(props),
    data: props,
  };
};

export type ShapeType = ReturnType<typeof createShape>;

export interface ShapeRef {
  getData: () => SvgConfig;
}

export type ShapeDrawerProps = {
  shapeType: string;
  getShape: (shapeType: string) => ShapeType | undefined;
  ref: Ref<ShapeRef>;
} & ShapeProps;

export type ShapeDrawerComponentProps = Omit<ShapeDrawerProps, 'getShape'>;
