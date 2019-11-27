/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InstallTemplateFunction } from './types';

export const macosInstallTemplate: InstallTemplateFunction = variables => `#!/bin/sh

node scripts/dev_agent --enrollmentToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0eXBlIjoiRU5ST0xMTUVOVF9UT0tFTiIsInBvbGljeV9pZCI6ImQwM2Q5MmEwLWZkYTgtMTFlOS1hODgwLWY5MGYwMWQ5NzE1ZiIsImlhdCI6MTU3MjcyMzcxMX0.A5IRF1DnEMQowRzaJjeXVdauXHo40ZYvkg9IEQHIHPg --kibanaUrl=${variables.kibanaUrl}

`;
