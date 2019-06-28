/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { storiesOf } from '@storybook/react';
import React from 'react';
import { ShapePreview } from '../shape_preview';

import { shapes } from '../../../../canvas_plugin_src/renderers/shape/shapes';

storiesOf('components/Shapes/ShapePreview', module)
  .add('arrow', () => <ShapePreview shape={shapes.arrow} />)
  .add('square', () => <ShapePreview shape={shapes.square} />);
