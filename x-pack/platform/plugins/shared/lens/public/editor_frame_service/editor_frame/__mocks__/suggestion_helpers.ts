/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type * as SuggestionHelpers from '../suggestion_helpers';

const actual = await vi.importActual<typeof SuggestionHelpers>('../suggestion_helpers');

vi.spyOn(actual, 'getSuggestions');

export const { getSuggestions, switchToSuggestion } = actual;
