/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

interface Props {
  message?: string;
}

export function ExampleSharedComponent({ message = 'See how it loads.' }: Props) {
  return <p>This is an example of an observability shared component. {message}</p>;
}
