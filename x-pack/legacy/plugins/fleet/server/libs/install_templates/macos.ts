/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InstallTemplateFunction } from './types';

export const macosInstallTemplate: InstallTemplateFunction = variables => `#!/bin/sh

echo "To install a agent node run:\nscripts/dev_agent --enrollmentToken=$(FLEET_ENROLLMENT_TOKEN)" --kibanaUrl=${variables.kibanaUrl}"
`;
