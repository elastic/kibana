/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type { CloudSecurityAnswer, ResourceData } from '../../common/types';
export declare const persistTokenCloudData: (
  savedObjectsClient: SavedObjectsClientContract,
  {
    logger,
    returnError,
    onboardingToken,
    solutionType,
    security,
    resourceData,
  }: {
    logger?: Logger;
    returnError?: boolean;
    onboardingToken?: string;
    solutionType?: string;
    security?: CloudSecurityAnswer;
    resourceData?: ResourceData;
  }
) => Promise<void>;
