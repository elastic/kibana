/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CustomPackageDatasetConfiguration } from '../../install';

// Dataset name must either match integration name exactly OR be prefixed with integration name and a dot.
export const checkDatasetsNameFormat = (
  datasets: CustomPackageDatasetConfiguration[],
  integrationName: string
) => {
  const invalidNames = datasets
    .filter((dataset) => {
      const { name } = dataset;
      return name !== integrationName && !name.startsWith(`${integrationName}.`);
    })
    .map((dataset) => dataset.name);

  if (invalidNames.length > 0) {
    throw new DatasetNamePrefixError(
      `Dataset names '${invalidNames.join(
        ', '
      )}' must either match integration name '${integrationName}' exactly or be prefixed with integration name and a dot (e.g. '${integrationName}.<dataset_name>').`
    );
  }
};

export class DatasetNamePrefixError extends Error {
  constructor(message?: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = 'DatasetNamePrefixError';
  }
}
