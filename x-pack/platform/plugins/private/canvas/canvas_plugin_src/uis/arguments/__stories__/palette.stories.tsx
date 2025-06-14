/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { action } from '@storybook/addon-actions';
import { PaletteArgInput } from '../palette';
import { paulTor14 } from '../../../../common/lib/palettes';

export default {
  title: 'arguments/Palette',
};

export const Default = {
  render: () => (
    <div className="canvasContainerWrapper" style={{ width: '200px' }}>
      <PaletteArgInput
        argValue={{
          type: 'expression',
          chain: [
            {
              arguments: {
                _: paulTor14.colors,
                gradient: [paulTor14.gradient],
              },
              function: 'palette',
              type: 'function',
            },
          ],
        }}
        onValueChange={action('onValueChange')}
        renderError={action('renderError')}
        typeInstance={{}}
      />
    </div>
  ),

  name: 'default',
};
