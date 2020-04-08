/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';

export const CertificatesType = t.type({
  certificate_not_valid_before: t.string,
  certificate_not_valid_after: t.string,
  sh256: t.string,
  issued_by: t.string,
  issued_to: t.string,
  common_name: t.string,
});

// Typescript type for type checking
export type Certificates = t.TypeOf<typeof CertificatesType>;
