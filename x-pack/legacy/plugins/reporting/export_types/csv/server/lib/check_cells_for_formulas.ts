/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as _ from 'lodash';

const formulaValues = ['=', '+', '-', '@'];

interface IFlattened {
  [header: string]: string;
}

export const checkIfRowsHaveFormulas = (flattened: IFlattened, fields: string[]) => {
  const pruned = _.pick(flattened, fields);
  const csvValues = [..._.keys(pruned), ...(_.values(pruned) as string[])];

  return _.some(csvValues, cell => _.some(formulaValues, char => _.startsWith(cell, char)));
};
