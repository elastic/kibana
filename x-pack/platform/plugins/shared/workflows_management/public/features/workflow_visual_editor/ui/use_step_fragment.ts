/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { ParsedStepFragment } from '../lib/parse_step_fragment';
import { parseStepFragment } from '../lib/parse_step_fragment';

/** The step fragment, parsed once per text however many places read it. */
export const useStepFragment = (text: string): ParsedStepFragment =>
  useMemo(() => parseStepFragment(text), [text]);
