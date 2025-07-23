/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildGrokRegexMap } from '../grok/parse_patterns';
import { PATTERN_OVERRIDES } from './pattern_precedence';

export const GROK_REGEX_MAP = buildGrokRegexMap(PATTERN_OVERRIDES);
