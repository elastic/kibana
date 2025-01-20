/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { Positionable } from '../positionable';
import { ElementContent } from '../element_content';

export const ElementWrapper = (props) => {
  const { renderable, transformMatrix, width, height, state, handlers, id } = props;

  return (
    <Positionable transformMatrix={transformMatrix} width={width} height={height}>
      <ElementContent
        id={id}
        renderable={renderable}
        state={state}
        handlers={handlers}
        width={width}
        height={height}
      />
    </Positionable>
  );
};

ElementWrapper.propTypes = {
  // positionable props (from element object)
  transformMatrix: PropTypes.arrayOf(PropTypes.number).isRequired,
  width: PropTypes.number.isRequired,
  height: PropTypes.number.isRequired,
  // ElementContent pass-through props
  renderable: PropTypes.object,
  state: PropTypes.string,
  handlers: PropTypes.object.isRequired,
  id: PropTypes.string.isRequired,
};
