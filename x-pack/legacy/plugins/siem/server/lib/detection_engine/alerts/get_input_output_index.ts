/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObject, SavedObjectAttributes } from 'src/core/server';
import { defaultIndexPattern } from '../../../../default_index_pattern';
import { AlertServices } from '../../../../../alerting/server/types';
import {
  DEFAULT_INDEX_KEY,
  DEFAULT_SIGNALS_INDEX_KEY,
  DEFAULT_SIGNALS_INDEX,
} from '../../../../common/constants';

interface IndexObjectAttributes extends SavedObjectAttributes {
  [DEFAULT_INDEX_KEY]: string[];
  [DEFAULT_SIGNALS_INDEX_KEY]: string;
}

export const getInputIndex = (
  inputIndex: string[] | undefined | null,
  configuration: SavedObject<IndexObjectAttributes>
): string[] => {
  if (inputIndex != null) {
    return inputIndex;
  } else {
    if (configuration.attributes[DEFAULT_INDEX_KEY] != null) {
      return configuration.attributes[DEFAULT_INDEX_KEY];
    } else {
      return defaultIndexPattern;
    }
  }
};

export const getOutputIndex = (
  outputIndex: string | undefined | null,
  configuration: SavedObject<IndexObjectAttributes>
): string => {
  if (outputIndex != null) {
    return outputIndex;
  } else {
    if (configuration.attributes[DEFAULT_SIGNALS_INDEX_KEY] != null) {
      return configuration.attributes[DEFAULT_SIGNALS_INDEX_KEY];
    } else {
      return DEFAULT_SIGNALS_INDEX;
    }
  }
};

export const getInputOutputIndex = async (
  services: AlertServices,
  version: string,
  inputIndex: string[] | null | undefined,
  outputIndex: string | null | undefined
): Promise<{
  inputIndex: string[];
  outputIndex: string;
}> => {
  if (inputIndex != null && outputIndex != null) {
    return { inputIndex, outputIndex };
  } else {
    const configuration = await services.savedObjectsClient.get('config', version);
    return {
      inputIndex: getInputIndex(inputIndex, configuration),
      outputIndex: getOutputIndex(outputIndex, configuration),
    };
  }
};
