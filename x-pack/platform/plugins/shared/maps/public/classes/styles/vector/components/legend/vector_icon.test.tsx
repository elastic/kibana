/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';

import { VectorIcon } from './vector_icon';

test('Renders PolygonIcon', () => {
  const { container } = render(
    <VectorIcon
      fillColor="#ff0000"
      isPointsOnly={false}
      isLinesOnly={false}
      strokeColor="rgb(106,173,213)"
    />
  );

  // Should render a PolygonIcon (for mixed geometry types)
  const svgElement = container.querySelector('svg');
  expect(svgElement).toBeInTheDocument();
  
  // Verify the polygon icon has correct styling (uses rect element)
  const rectElement = container.querySelector('rect');
  expect(rectElement).toBeInTheDocument();
  expect(svgElement).toHaveStyle('fill: #ff0000');
  expect(svgElement).toHaveStyle('stroke: rgb(106,173,213)');
  expect(svgElement).toHaveStyle('stroke-width: 1px');
});

test('Renders LineIcon', () => {
  const { container } = render(
    <VectorIcon isPointsOnly={false} isLinesOnly={true} strokeColor="rgb(106,173,213)" />
  );

  // Should render a LineIcon (for line-only geometry)
  const svgElement = container.querySelector('svg');
  expect(svgElement).toBeInTheDocument();
  
  // Verify it's a line icon with correct styling
  const lineElement = container.querySelector('line');
  expect(lineElement).toBeInTheDocument();
  expect(svgElement).toHaveStyle('stroke: rgb(106,173,213)');
  expect(svgElement).toHaveStyle('stroke-width: 4px');
});

test('Renders CircleIcon', () => {
  const { container } = render(
    <VectorIcon
      fillColor="#ff0000"
      isPointsOnly={true}
      isLinesOnly={false}
      strokeColor="rgb(106,173,213)"
    />
  );

  // Should render a CircleIcon (for points-only geometry)
  const svgElement = container.querySelector('svg');
  expect(svgElement).toBeInTheDocument();
  
  // Verify it's a circle icon with correct styling
  const ellipseElement = container.querySelector('ellipse');
  expect(ellipseElement).toBeInTheDocument();
  expect(svgElement).toHaveStyle('fill: #ff0000');
  expect(svgElement).toHaveStyle('stroke: rgb(106,173,213)');
  expect(svgElement).toHaveStyle('stroke-width: 1px');
});

test('Renders SymbolIcon', () => {
  // Symbol icons have async loading behavior and may render empty initially
  // The main test is that they don't crash when rendered
  expect(() => {
    render(
      <VectorIcon
        fillColor="#ff0000"
        isPointsOnly={true}
        isLinesOnly={false}
        strokeColor="rgb(106,173,213)"
        symbolId="airfield-15"
        svg='<?xml version="1.0" encoding="UTF-8"?>\n<svg version="1.1" id="airfield-15" xmlns="http://www.w3.org/2000/svg" width="15px" height="15px" viewBox="0 0 15 15">\n  <path id="path5" d="M6.8182,0.6818H4.7727&#xA;&#x9;C4.0909,0.6818,4.0909,0,4.7727,0h5.4545c0.6818,0,0.6818,0.6818,0,0.6818H8.1818c0,0,0.8182,0.5909,0.8182,1.9545V4h6v2L9,8l-0.5,5&#xA;&#x9;l2.5,1.3182V15H4v-0.6818L6.5,13L6,8L0,6V4h6V2.6364C6,1.2727,6.8182,0.6818,6.8182,0.6818z"/>\n</svg>'
      />
    );
  }).not.toThrow();
});

test('Renders SymbolIcon with custom icon', () => {
  // Custom symbol icons have async loading behavior and may render empty initially
  // The main test is that they don't crash when rendered
  expect(() => {
    render(
      <VectorIcon
        fillColor="#00ff00"
        isPointsOnly={true}
        isLinesOnly={false}
        strokeColor="rgb(0,255,0)"
        symbolId="__kbn__custom_icon_sdf__foobar"
        svg='<svg width="200" height="250" xmlns="http://www.w3.org/2000/svg"><path stroke="#000" fill="transparent" stroke-width="5" d="M10 10h30v30H10z"/></svg>'
      />
    );
  }).not.toThrow();
});
