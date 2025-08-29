/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const TAG_DELIMITER = '::';
const INHERENT_TAG_PREFIX = 'inherent';
const CUSTOM_TAG_PREFIX = 'custom';

export const parseTag = (tag: string): { inherent: boolean; value: string } => {
  const delimiterIndex = tag.indexOf(TAG_DELIMITER);
  if (delimiterIndex === -1) {
    return { inherent: false, value: tag };
  }
  const inherent = tag.slice(0, delimiterIndex) === INHERENT_TAG_PREFIX;
  const value = tag.slice(delimiterIndex + TAG_DELIMITER.length);
  return { inherent, value };
};

export const createInherentTag = (value: string) => {
  return `${INHERENT_TAG_PREFIX}${TAG_DELIMITER}${value}`;
};

export const createCustomTag = (value: string) => {
  return `${CUSTOM_TAG_PREFIX}${TAG_DELIMITER}${value}`;
};
