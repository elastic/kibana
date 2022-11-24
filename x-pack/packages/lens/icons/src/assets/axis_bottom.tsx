/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';

export const EuiIconAxisBottom = ({
  title,
  titleId,
  ...props
}: {
  title: string;
  titleId: string;
}) => (
  <svg
    width={16}
    height={16}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-labelledby={titleId}
    {...props}
  >
    {title ? <title id={titleId}>{title}</title> : null}
    <path d="M5 1.5a.5.5 0 111 0v7a.5.5 0 01-1 0v-7zM15.39 11.39a1.5 1.5 0 010 2.12l-2.122 2.122a.5.5 0 11-.707-.707l2.121-2.122a.5.5 0 000-.707l-2.121-2.12a.5.5 0 11.707-.708l2.121 2.121zM3.439 9.269a.5.5 0 010 .707l-2.122 2.121a.5.5 0 000 .707l2.122 2.121a.5.5 0 01-.707.708L.61 13.51a1.5 1.5 0 010-2.121l2.122-2.121a.5.5 0 01.707 0zM8 3a.5.5 0 01.5.5v5a.5.5 0 01-1 0v-5A.5.5 0 018 3zM11 5.5a.5.5 0 00-1 0v3a.5.5 0 001 0v-3z" />
    <path d="M3.5 12a.5.5 0 000 1h9a.5.5 0 000-1h-9z" />
  </svg>
);
