/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { INITIAL_LOCATION } from '../../../common/constants';
import { Goto, MapCenterAndZoom, MapSettings } from '../../../common/descriptor_types';

export async function getInitialView(
  goto: Goto | null | undefined,
  settings: MapSettings
): Promise<MapCenterAndZoom | null> {
  if (settings.initialLocation === INITIAL_LOCATION.FIXED_LOCATION) {
    return {
      lat: settings.fixedLocation.lat,
      lon: settings.fixedLocation.lon,
      zoom: settings.fixedLocation.zoom,
    };
  }

  if (settings.initialLocation === INITIAL_LOCATION.BROWSER_LOCATION) {
    return await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        // success callback
        (pos) => {
          resolve({
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
            zoom: settings.browserLocation.zoom,
          });
        },
        // error callback
        () => {
          // eslint-disable-next-line no-console
          console.warn('Unable to fetch browser location for initial map location');
          resolve(null);
        }
      );
    });
  }

  if (settings.initialLocation === INITIAL_LOCATION.AUTO_FIT_TO_BOUNDS) {
    // map bounds pulled from data sources. Just use default map location
    return null;
  }

  return goto && goto.center ? goto.center : null;
}
