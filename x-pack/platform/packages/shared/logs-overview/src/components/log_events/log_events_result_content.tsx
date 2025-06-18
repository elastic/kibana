/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

export interface LogEventsResultContentProps {}

export interface LogEventsResultContentDependencies {}

export const LogEventsResultContent = React.memo<LogEventsResultContentProps>(() => {
  return <p>Log Events go here</p>;
});
