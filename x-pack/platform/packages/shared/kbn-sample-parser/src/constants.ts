/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Path from 'path';
import { REPO_ROOT } from '@kbn/repo-info';

export const LOGHUB_DIR = Path.join(REPO_ROOT, '../loghub');
export const LOGHUB_REPO = 'https://github.com/logpai/loghub.git';
export const LOGHUB_PARSER_DIR = Path.join(__dirname, '../parsers');
