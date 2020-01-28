/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AlertServices } from '../../../../../../../plugins/alerting/server';
import { defaultIndexPattern } from '../../../../default_index_pattern';
import { DEFAULT_INDEX_KEY } from '../../../../common/constants';

export const getInputIndex = async (
  services: AlertServices,
  version: string,
  inputIndex: string[] | null | undefined
): Promise<string[]> => {
  if (inputIndex != null) {
    return inputIndex;
  } else {
    const configuration = await services.savedObjectsClient.get('config', version);
    if (configuration.attributes != null && configuration.attributes[DEFAULT_INDEX_KEY] != null) {
      return configuration.attributes[DEFAULT_INDEX_KEY];
    } else {
      return defaultIndexPattern;
    }
  }
};
