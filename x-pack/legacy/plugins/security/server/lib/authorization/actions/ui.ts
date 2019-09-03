/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { isString } from 'lodash';
import { UICapabilities } from 'ui/capabilities';
import { uiCapabilitiesRegex } from '../../../../../xpack_main/types';

export class UIActions {
  private readonly prefix: string;

  constructor(versionNumber: string) {
    this.prefix = `ui:${versionNumber}:`;
  }

  public get all(): string {
    return `${this.prefix}*`;
  }

  public get allNavLinks(): string {
    return `${this.prefix}navLinks/*`;
  }

  public get allCatalogueEntries(): string {
    return `${this.prefix}catalogue/*`;
  }

  public get allManagmentLinks(): string {
    return `${this.prefix}management/*`;
  }

  public get(featureId: keyof UICapabilities, ...uiCapabilityParts: string[]) {
    if (!featureId || !isString(featureId)) {
      throw new Error('featureId is required and must be a string');
    }

    if (!uiCapabilityParts || !Array.isArray(uiCapabilityParts)) {
      throw new Error('uiCapabilityParts is required and must be an array');
    }

    if (
      uiCapabilityParts.length === 0 ||
      uiCapabilityParts.findIndex(
        part => !part || !isString(part) || !uiCapabilitiesRegex.test(part)
      ) >= 0
    ) {
      throw new Error(
        `UI capabilities are required, and must all be strings matching the pattern ${uiCapabilitiesRegex}`
      );
    }

    return `${this.prefix}${featureId}/${uiCapabilityParts.join('/')}`;
  }
}
