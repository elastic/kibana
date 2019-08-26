/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';

export const TimelineContext = React.createContext<boolean>(false);

export const TimelineWidthContext = React.createContext<number>(0);
