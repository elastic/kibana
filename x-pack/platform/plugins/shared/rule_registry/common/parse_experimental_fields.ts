/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { isLeft } from 'fp-ts/Either';
import { PathReporter } from 'io-ts/lib/PathReporter';
import { pick } from 'lodash';
import type { ExperimentalRuleFieldMap } from '@kbn/alerts-as-data-utils';
import { legacyExperimentalFieldMap } from '@kbn/alerts-as-data-utils';

import { runtimeTypeFromFieldMap } from './field_map';

const experimentalFieldRuntimeType = runtimeTypeFromFieldMap<ExperimentalRuleFieldMap>(
  legacyExperimentalFieldMap
);

export const parseExperimentalFields = (input: unknown, partial = false) => {
  const decodePartial = (alert: unknown) => {
    const limitedFields = pick(legacyExperimentalFieldMap, Object.keys(alert as object));
    const partialTechnicalFieldRuntimeType = runtimeTypeFromFieldMap<ExperimentalRuleFieldMap>(
      limitedFields as unknown as ExperimentalRuleFieldMap
    );
    return partialTechnicalFieldRuntimeType.decode(alert);
  };

  const validate = partial ? decodePartial(input) : experimentalFieldRuntimeType.decode(input);

  if (isLeft(validate)) {
    throw new Error(PathReporter.report(validate).join('\n'));
  }
  return experimentalFieldRuntimeType.encode(validate.right);
};

export type ParsedExperimentalFields = ReturnType<typeof parseExperimentalFields>;
