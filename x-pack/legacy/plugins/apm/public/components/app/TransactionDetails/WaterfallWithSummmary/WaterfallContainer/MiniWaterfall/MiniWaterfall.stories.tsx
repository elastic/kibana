/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { BrushEndListener } from '@elastic/charts';
import '@elastic/charts/dist/theme_light.css';
import { storiesOf } from '@storybook/react';
import React from 'react';
import { MiniWaterfall } from '.';
import { WaterfallSelection } from '../';
import { getWaterfall } from '../Waterfall/waterfall_helpers/waterfall_helpers';
import response from './__fixtures__/exampleTransaction.json';

// The contents of scrubber.data.json is was directly copied from a trace API
// response, originally http://localhost:5601/kbn/api/apm/traces/21bd90461ba6355df98352070360f5f7?start=2020-01-23T17%3A33%3A56.839Z&end=2020-02-24T17%3A33%3A56.840Z
// You can paste the contents of any trace to see the response.
const entryTransactionId = '6528d29667c22f62';
const waterfall = getWaterfall(response, entryTransactionId);

function Example() {
  const [selection, setSelection] = React.useState<WaterfallSelection>([
    undefined,
    undefined
  ]);

  const onBrushEnd: BrushEndListener = (y1, y2) => {
    // FIXME: Since brushing is broken, just pick some random numbers
    const maxY = Math.max(
      ...waterfall.items.map(item => item.offset + item.duration)
    );
    const start = Math.floor(Math.random() * maxY);
    const end = Math.floor(Math.random() * (maxY - start)) + start;
    console.log({ start, end, maxY });

    // setSelection([y1, y2]);
    setSelection([start, end]);
  };

  function resetSelection() {
    setSelection([undefined, undefined]);
  }

  return (
    <MiniWaterfall
      onBrushEnd={onBrushEnd}
      resetSelection={resetSelection}
      selection={selection}
      waterfall={waterfall}
    />
  );
}

storiesOf('app/TransactionDetails/MiniWaterfall', module).add(
  'example',
  () => {
    return (
      <div style={{ maxWidth: 1330, padding: 16, border: '1px solid grey' }}>
        <Example />
      </div>
    );
  },
  { info: { source: false, propTables: false }, showAddonPanel: false }
);
