/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ExpressionFunction } from 'src/legacy/core_plugins/interpreter/public';
import { Datatable } from '../types';
import { getFunctionHelp } from '../../strings';

const noop = () => {};

interface Return extends Datatable {
  columns: [{ name: 'latitude'; type: 'number' }, { name: 'longitude'; type: 'number' }];
  rows: [{ latitude: number; longitude: number }];
}

export function location(): ExpressionFunction<'location', null, {}, Promise<Return>> {
  const { help } = getFunctionHelp().location;

  return {
    name: 'location',
    type: 'datatable',
    context: {
      types: ['null'],
    },
    args: {},
    help,
    fn: () => {
      return new Promise(resolve => {
        function createLocation(geoposition: Position) {
          const { latitude, longitude } = geoposition.coords;
          return resolve({
            type: 'datatable',
            columns: [{ name: 'latitude', type: 'number' }, { name: 'longitude', type: 'number' }],
            rows: [{ latitude, longitude }],
          });
        }
        return navigator.geolocation.getCurrentPosition(createLocation, noop, {
          maximumAge: 5000,
        });
      });
    },
  };
}
