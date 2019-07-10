/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Moment } from 'moment';

declare interface TimefilterBounds {
  min: Moment;
  max: Moment;
}

export class MlTimeBuckets {
  setBarTarget: (barTarget: number) => void;
  setMaxBars: (maxBars: number) => void;
  setInterval: (interval: string) => void;
  setBounds: (bounds: TimefilterBounds) => void;
  getBounds: () => { min: any; max: any };
  getInterval: () => {
    asMilliseconds: () => number;
  };
}
