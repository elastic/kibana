/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { INITIAL_LOCATION } from '../../../common/constants';
import type { MapCenterAndZoom, MapSettings } from '../../../common/descriptor_types';

export async function getInitialView(settings: MapSettings): Promise<MapCenterAndZoom | null> {
  if (settings.initial_location === INITIAL_LOCATION.FIXED_LOCATION) {
    return {
      lat: settings.fixed_location.lat,
      lon: settings.fixed_location.lon,
      zoom: settings.fixed_location.zoom,
    };
  }

  return settings.initial_location === INITIAL_LOCATION.BROWSER_LOCATION
    ? await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          // success callback
          (pos) => {
            resolve({
              lat: pos.coords.latitude,
              lon: pos.coords.longitude,
              zoom: settings.browser_location.zoom,
            });
          },
          // error callback
          () => {
            // eslint-disable-next-line no-console
            console.warn('Unable to fetch browser location for initial map location');
            resolve(null);
          }
        );
      })
    : null;
}
