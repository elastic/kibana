/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { logsCustom } from './logs_customs';
import { logsNginx } from './logs_nginx';
import { logsNginxAccess } from './logs_nginx_access_default_pipeline';
import { logsNginxErrors } from './logs_nginx_errors_default_pipeline';

export const ingestPipelines = [logsCustom, logsNginx, logsNginxAccess, logsNginxErrors];
