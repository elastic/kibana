/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios from 'axios';
import { pick } from 'lodash';
import { SyntheticsServerSetup } from '../types';
import {
  ManifestLocation,
  PublicLocation,
  PublicLocations,
  ThrottlingOptions,
  BandwidthLimitKey,
  LocationStatus,
} from '../../common/runtime_types';

export const getDevLocation = (devUrl: string): PublicLocation => ({
  id: 'dev',
  label: 'Dev Service',
  geo: { lat: 0, lon: 0 },
  url: devUrl,
  isServiceManaged: true,
  status: LocationStatus.EXPERIMENTAL,
  isInvalid: false,
});

export async function getServiceLocations(server: SyntheticsServerSetup) {
  let locations: PublicLocations = [];

  if (server.config.service?.devUrl) {
    locations = [getDevLocation(server.config.service.devUrl)];
  }
  const manifestUrl = server.config.service?.manifestUrl;

  if (!manifestUrl || manifestUrl === 'mockDevUrl') {
    return { locations };
  }

  try {
    const { data } = await axios.get<{
      throttling: ThrottlingOptions;
      locations: Record<string, ManifestLocation>;
    }>(server.config.service!.manifestUrl!);

    const availableLocations = Object.entries(data.locations);

    availableLocations.forEach(([locationId, location]) => {
      locations.push({
        id: locationId,
        label: location.geo.name,
        geo: location.geo.location,
        url: location.url,
        isServiceManaged: true,
        status: location.status,
        isInvalid: false,
      });
    });

    const throttling = pick(
      data.throttling,
      BandwidthLimitKey.DOWNLOAD,
      BandwidthLimitKey.UPLOAD
    ) as ThrottlingOptions;

    return { throttling, locations };
  } catch (e) {
    server.logger.error(e);
    return { locations: [] };
  }
}
