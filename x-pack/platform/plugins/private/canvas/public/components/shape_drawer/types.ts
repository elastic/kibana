/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Component, CSSProperties, SVGProps } from 'react';

export interface ViewBoxParams {
  minX: number;
  minY: number;
  width: number;
  height: number;
}
export interface ParentNodeParams {
  borderOffset: number;
  width: number;
  height: number;
}

export type ShapeProps = {
  shapeAttributes?: ShapeAttributes;
  shapeContentAttributes?: ShapeContentAttributes &
    SpecificShapeContentAttributes & { ref?: React.RefObject<any> };
  textAttributes?: SvgTextAttributes;
} & Component['props'] & { ref?: React.RefObject<any> };

export enum SvgElementTypes {
  polygon = 'POLYGON',
  circle = 'CIRCLE',
  rect = 'RECT',
  path = 'PATH',
}

export interface ShapeAttributes {
  fill?: SVGProps<SVGElement>['fill'];
  stroke?: SVGProps<SVGElement>['stroke'];
  width?: SVGProps<SVGElement>['width'];
  height?: SVGProps<SVGElement>['height'];
  viewBox?: ViewBoxParams;
  overflow?: SVGProps<SVGElement>['overflow'];
  preserveAspectRatio?: SVGProps<SVGElement>['preserveAspectRatio'];
}

export interface ShapeContentAttributes {
  strokeWidth?: SVGProps<SVGElement>['strokeWidth'];
  stroke?: SVGProps<SVGElement>['stroke'];
  fill?: SVGProps<SVGElement>['fill'];
  vectorEffect?: SVGProps<SVGElement>['vectorEffect'];
  strokeMiterlimit?: SVGProps<SVGElement>['strokeMiterlimit'];
}
export interface SvgConfig {
  shapeType?: SvgElementTypes;
  viewBox: ViewBoxParams;
  shapeProps: ShapeContentAttributes &
    SpecificShapeContentAttributes &
    Component['props'] & { ref?: React.RefObject<any> };
  textAttributes?: SvgTextAttributes;
}

export type SvgTextAttributes = Partial<Element> & {
  x?: SVGProps<SVGTextElement>['x'];
  y?: SVGProps<SVGTextElement>['y'];
  textAnchor?: SVGProps<SVGTextElement>['textAnchor'];
  dominantBaseline?: SVGProps<SVGTextElement>['dominantBaseline'];
  dx?: SVGProps<SVGTextElement>['dx'];
  dy?: SVGProps<SVGTextElement>['dy'];
} & { style?: CSSProperties } & { ref?: React.RefObject<SVGTextElement> };

export interface CircleParams {
  r: SVGProps<SVGCircleElement>['r'];
  cx: SVGProps<SVGCircleElement>['cx'];
  cy: SVGProps<SVGCircleElement>['cy'];
}

export interface RectParams {
  x: SVGProps<SVGRectElement>['x'];
  y: SVGProps<SVGRectElement>['y'];
  width: SVGProps<SVGRectElement>['width'];
  height: SVGProps<SVGRectElement>['height'];
}

export interface PathParams {
  d: SVGProps<SVGPathElement>['d'];
  strokeLinecap?: SVGProps<SVGPathElement>['strokeLinecap'];
}

export interface PolygonParams {
  points?: SVGProps<SVGPolygonElement>['points'];
  strokeLinejoin?: SVGProps<SVGPolygonElement>['strokeLinejoin'];
}

export type SpecificShapeContentAttributes = CircleParams | RectParams | PathParams | PolygonParams;
