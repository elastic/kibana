/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Moment } from 'moment';

declare interface TimeFilterBounds {
  min: Moment;
  max: Moment;
}

export class TimeBuckets {
  setBarTarget: (barTarget: number) => void;
  setMaxBars: (maxBars: number) => void;
  setInterval: (interval: string) => void;
  setBounds: (bounds: TimeFilterBounds) => void;
  getBounds: () => { min: any; max: any };
  getInterval: () => {
    asMilliseconds: () => number;
    expression: string;
  };
}
