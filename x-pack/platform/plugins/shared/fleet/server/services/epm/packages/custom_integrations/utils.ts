/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const convertStringToTitle = (name: string) => {
  return name
    .split('_')
    .filter((word) => word.length > 0)
    .map((word) => {
      return word[0].toUpperCase() + word.substring(1);
    })
    .join(' ');
};

export const generateDescription = (datasetNames: string[]) =>
  `Collect logs for the datasets: ${datasetNames.join(', ')}`;
