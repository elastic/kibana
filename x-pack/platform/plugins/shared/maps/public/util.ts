/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EMSClient, FileLayer, TMSService } from '@elastic/ems-client';
import { getEMSSettings, getMapsEmsStart } from './kibana_services';
import { getLicenseId } from './licensed_features';

export function getKibanaTileMap(): unknown {
  const mapsEms = getMapsEmsStart();
  return mapsEms.config.tilemap ? mapsEms.config.tilemap : {};
}

export async function getEmsFileLayers(): Promise<FileLayer[]> {
  if (!getEMSSettings().isEMSEnabled()) {
    return [];
  }

  return (await getEMSClient()).getFileLayers();
}

export async function getEmsTmsServices(): Promise<TMSService[]> {
  if (!getEMSSettings().isEMSEnabled()) {
    return [];
  }

  return (await getEMSClient()).getTMSServices();
}

let emsClientPromise: Promise<EMSClient> | null = null;
let latestLicenseId: string | undefined;
async function getEMSClient(): Promise<EMSClient> {
  if (!emsClientPromise) {
    emsClientPromise = new Promise(async (resolve, reject) => {
      try {
        const emsClient = await getMapsEmsStart().createEMSClient();
        resolve(emsClient);
      } catch (error) {
        reject(error);
      }
    });
  }
  const emsClient = await emsClientPromise;
  const licenseId = getLicenseId();
  if (latestLicenseId !== licenseId) {
    latestLicenseId = licenseId;
    emsClient.addQueryParams({ license: licenseId ? licenseId : '' });
  }
  return emsClient;
}

export function isRetina(): boolean {
  return window.devicePixelRatio === 2;
}
