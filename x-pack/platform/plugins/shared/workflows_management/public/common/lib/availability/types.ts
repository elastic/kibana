/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type UnavailabilityReason = 'license' | 'serverless_tier';
export type ServerlessTierRequiredProducts = string[];

export type AvailabilityStatus =
  | {
      isAvailable: true;
    }
  | {
      isAvailable: false;
      unavailabilityReason: 'license';
    }
  | {
      isAvailable: false;
      unavailabilityReason: 'serverless_tier';
      requiredProducts: ServerlessTierRequiredProducts;
    };

export type ServerlessTierAvailability =
  | {
      isValid: true;
    }
  | {
      isValid: false;
      requiredProducts: ServerlessTierRequiredProducts;
    };
