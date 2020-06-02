/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as _ from 'lodash';
import { cellHasFormulas } from './cell_has_formula';

interface IFlattened {
  [header: string]: string;
}

export const checkIfRowsHaveFormulas = (flattened: IFlattened, fields: string[]) => {
  const pruned = _.pick(flattened, fields);
  const cells = [..._.keys(pruned), ...(_.values(pruned) as string[])];

  return _.some(cells, (cell) => cellHasFormulas(cell));
};
