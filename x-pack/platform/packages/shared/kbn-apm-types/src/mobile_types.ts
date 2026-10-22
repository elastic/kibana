/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum MobileProperty {
  Device = 'device',
  NetworkConnectionType = 'netConnectionType',
  OsVersion = 'osVersion',
  AppVersion = 'appVersion',
}

export type MobilePropertyType =
  | MobileProperty.Device
  | MobileProperty.OsVersion
  | MobileProperty.AppVersion
  | MobileProperty.NetworkConnectionType;

/**
 * Which mobile documents a request is scoped to. `Crash` maps to `error.type: crash`;
 * `Error` means error documents that are *not* crashes, so it is not itself an
 * `error.type` value.
 */
export enum MobileErrorType {
  Crash = 'crash',
  Error = 'error',
}
