/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { CSSProperties, RefCallback, useCallback, useEffect, useRef, useState } from 'react';
import { useResizeObserver } from '@elastic/eui';
import { IInterpreterRenderHandlers } from '@kbn/expressions-plugin/common';
import { v4 as uuidv4 } from 'uuid';
import {
  getShapeContentElement,
  getDefaultShapeData,
  ShapeRef,
  SvgConfig,
  SvgTextAttributes,
} from '../../../../public/components/shape_drawer';
import { NodeDimensions, ProgressRendererConfig } from '../types';
import { ProgressDrawerComponent } from './progress_drawer';
import { getTextAttributes, getViewBox } from './utils';

export function getId(type: string): string {
  return `${type}-${uuidv4()}`;
}

interface ProgressComponentProps extends ProgressRendererConfig {
  onLoaded: IInterpreterRenderHandlers['done'];
  parentNode: HTMLElement;
}

export function ProgressComponent({
  onLoaded,
  parentNode,
  shape: shapeType,
  value,
  max,
  valueColor,
  barColor,
  valueWeight,
  barWeight,
  label,
  font,
}: ProgressComponentProps) {
  const parentNodeDimensions = useResizeObserver(parentNode);
  const [dimensions, setDimensions] = useState<NodeDimensions>({
    width: parentNode.offsetWidth,
    height: parentNode.offsetHeight,
  });
  const [shapeData, setShapeData] = useState<SvgConfig>(getDefaultShapeData());
  const shapeRef = useCallback<RefCallback<ShapeRef>>((node) => {
    if (node !== null) {
      setShapeData(node.getData());
    }
  }, []);

  const [totalLength, setTotalLength] = useState<number>(0);

  useEffect(() => {
    setDimensions({
      width: parentNode.offsetWidth,
      height: parentNode.offsetHeight,
    });
    onLoaded();
  }, [onLoaded, parentNode, parentNodeDimensions]);

  const progressRef = useRef<
    SVGCircleElement & SVGPathElement & SVGPolygonElement & SVGRectElement
  >(null);
  const textRef = useRef<SVGTextElement>(null);

  useEffect(() => {
    setTotalLength(progressRef.current ? progressRef.current.getTotalLength() : 0);
  }, [shapeType, shapeData, progressRef]);

  const BarProgress = shapeData.shapeType ? getShapeContentElement(shapeData.shapeType) : null;

  const shapeContentAttributes = {
    fill: 'none',
    stroke: barColor,
    strokeWidth: `${barWeight}px`,
  };

  const percent = value / max;
  const to = totalLength * (1 - percent);

  const barProgressAttributes = {
    ...shapeData.shapeProps,
    fill: 'none',
    stroke: valueColor,
    strokeWidth: `${valueWeight}px`,
    strokeDasharray: totalLength,
    strokeDashoffset: Math.max(0, to),
  };

  const { width: labelWidth, height: labelHeight } = textRef.current
    ? textRef.current.getBBox()
    : { width: 0, height: 0 };

  const offset = Math.max(valueWeight, barWeight);

  const updatedTextAttributes = shapeData.textAttributes
    ? getTextAttributes(shapeType, shapeData.textAttributes, offset, label)
    : {};

  const textAttributes: SvgTextAttributes = {
    style: font.spec as CSSProperties,
    ...updatedTextAttributes,
  };

  const updatedViewBox = getViewBox(shapeType, shapeData.viewBox, offset, labelWidth, labelHeight);
  const shapeAttributes = {
    id: getId('svg'),
    ...(dimensions || {}),
    viewBox: updatedViewBox,
  };

  return (
    <div className="shapeAligner">
      <ProgressDrawerComponent
        shapeType={shapeType}
        shapeContentAttributes={{ ...shapeContentAttributes, ref: progressRef }}
        shapeAttributes={shapeAttributes}
        textAttributes={{ ...textAttributes, ref: textRef }}
        ref={shapeRef}
      >
        {BarProgress && <BarProgress {...barProgressAttributes} />}
      </ProgressDrawerComponent>
    </div>
  );
}
