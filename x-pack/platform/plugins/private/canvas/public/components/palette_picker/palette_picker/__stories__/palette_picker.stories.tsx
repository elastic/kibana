/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC} from 'react';
import React, { useState } from 'react';
import { action } from '@storybook/addon-actions';
import { storiesOf } from '@storybook/react';
import { PalettePicker } from '..';

import type { ColorPalette } from '../../../../../common/lib/palettes';
import { paulTor14 } from '../../../../../common/lib/palettes';
import type { CustomColorPalette } from '../../types';

const Interactive: FC = () => {
  const [palette, setPalette] = useState<ColorPalette | CustomColorPalette | null>(paulTor14);
  return <PalettePicker palette={palette} onChange={setPalette} clearable={true} />;
};

storiesOf('components/Color/PalettePicker', module)
  .addDecorator((fn) => <div style={{ width: '350px' }}>{fn()}</div>)
  .add('default', () => <PalettePicker palette={paulTor14} onChange={action('onChange')} />)
  .add('clearable', () => (
    <PalettePicker palette={null} onChange={action('onChange')} clearable={true} />
  ))
  .add('interactive', () => <Interactive />);
