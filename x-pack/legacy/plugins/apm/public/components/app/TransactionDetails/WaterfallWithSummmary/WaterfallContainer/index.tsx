/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { BrushEndListener } from '@elastic/charts';
import { Location } from 'history';
import React, { useState } from 'react';
import { IUrlParams } from '../../../../../context/UrlParamsContext/types';
import { MiniWaterfall } from './MiniWaterfall';
import { ServiceLegends } from './ServiceLegends';
import { Waterfall } from './Waterfall';
import { IWaterfall } from './Waterfall/waterfall_helpers/waterfall_helpers';

export type WaterfallSelection = [number, number] | [undefined, undefined];

interface Props {
  urlParams: IUrlParams;
  location: Location;
  waterfall: IWaterfall;
  exceedsMax: boolean;
}

export function WaterfallContainer({
  location,
  urlParams,
  waterfall,
  exceedsMax
}: Props) {
  const [selection, setSelection] = useState<WaterfallSelection>([
    undefined,
    undefined
  ]);

  if (!waterfall) {
    return null;
  }

  return (
    <div>
      <ServiceLegends serviceColors={waterfall.serviceColors} />
      <MiniWaterfall
        setSelection={setSelection}
        selection={selection}
        waterfall={waterfall}
      />
      <Waterfall
        location={location}
        waterfallItemId={urlParams.waterfallItemId}
        waterfall={waterfall}
        exceedsMax={exceedsMax}
      />
    </div>
  );
}
