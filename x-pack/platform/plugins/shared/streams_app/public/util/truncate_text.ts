/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const truncateText = (value: string, maxLength: number): string => {
  if (value.length <= maxLength) {
    return value;
  }

  const halfLength = maxLength / 2;
  const truncatedText = `${value.slice(0, halfLength)}...${value.slice(-halfLength)}`;

  return truncatedText;
};
