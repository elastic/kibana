/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Note on the form validation and input components used:
// All inputs use `EuiFieldText` which means all form values will be treated as strings.
// This means we cast other formats like numbers coming from the transform config to strings,
// then revalidate them and cast them again to number before submitting a transform update.
// We do this so we have fine grained control over field validation and the option to
// cast to special values like `null` for disabling `docs_per_second`.
export const valueParsers = {
  defaultParser: (v: string) => v,
  nullableNumberParser: (v: string) => (v === '' ? null : +v),
  numberParser: (v: string) => +v,
};
export type ValueParserName = keyof typeof valueParsers;
