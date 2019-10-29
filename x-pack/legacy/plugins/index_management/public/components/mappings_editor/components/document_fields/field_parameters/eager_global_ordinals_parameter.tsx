/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { EditFieldFormRow } from '../fields/edit_field';

export const EagerGlobalOrdinalsParameter = () => (
  <EditFieldFormRow
    title={<h3>Use eager global ordinals</h3>}
    description="This is description text."
    formFieldPath="eager_global_ordinals"
  />
);
