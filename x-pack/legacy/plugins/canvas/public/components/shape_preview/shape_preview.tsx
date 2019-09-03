/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';

interface Props {
  shape?: string;
}

export const ShapePreview = ({ shape }: Props) => {
  if (!shape) {
    return <div className="canvasShapePreview" />;
  }

  const weight = 5;
  const parser = new DOMParser();
  const shapeSvg = parser
    .parseFromString(shape, 'image/svg+xml')
    .getElementsByTagName('svg')
    .item(0);

  if (!shapeSvg) {
    throw new Error('An unexpected error occurred: the SVG was not parseable');
  }

  shapeSvg.setAttribute('fill', 'none');
  shapeSvg.setAttribute('stroke', 'black');

  const viewBox = shapeSvg.getAttribute('viewBox') || '0 0 0 0';
  const initialViewBox = viewBox.split(' ').map((v: string) => parseInt(v, 10));

  let [minX, minY, width, height] = initialViewBox;
  minX -= weight / 2;
  minY -= weight / 2;
  width += weight;
  height += weight;
  shapeSvg.setAttribute('viewBox', [minX, minY, width, height].join(' '));

  return (
    // eslint-disable-next-line react/no-danger
    <div className="canvasShapePreview" dangerouslySetInnerHTML={{ __html: shapeSvg.outerHTML }} />
  );
};

ShapePreview.propTypes = {
  shape: PropTypes.string,
};
