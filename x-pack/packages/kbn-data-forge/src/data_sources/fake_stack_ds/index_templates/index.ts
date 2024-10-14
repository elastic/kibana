/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IndexTemplateDef } from '../../../types';
import { logsNginx } from './logs_nginx';
import { logsNginxAccess } from './logs_nginx_access';
import { logsNginxErrors } from './logs_nginx_errors';

export const indexTemplates: IndexTemplateDef[] = [logsNginx, logsNginxAccess, logsNginxErrors];
