/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MatrixHistogram } from '../../lib/matrix_histogram';
import { createOptions } from '../../utils/build_query/create_options';
import { SourceResolvers } from '../types';

export interface MatrixHistogramResolversDeps {
  matrixHistogram: MatrixHistogram;
}

export const createMatrixHistogramResolvers = (
  libs: MatrixHistogramResolversDeps
): {
  Source: {
    MatrixHistogram: SourceResolvers['MatrixHistogram'];
  };
} => ({
  Source: {
    async MatrixHistogram(source, args, { req }, info) {
      const options = {
        ...createOptions(source, args, info),
        stackByField: args.stackByField,
        histogramType: args.histogramType,
      };
      return libs.matrixHistogram.getMatrixHistogramData(req, options);
    },
  },
});
