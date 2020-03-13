/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { indexPatterns } from '../../../../../../../../src/plugins/data/public';

export const INDEX_ILLEGAL_CHARACTERS_VISIBLE = [...indexPatterns.ILLEGAL_CHARACTERS_VISIBLE, '*'];

// Insert the comma into the middle, so it doesn't look as if it has grammatical meaning when
// these characters are rendered in the UI.
const insertionIndex = Math.floor(indexPatterns.ILLEGAL_CHARACTERS_VISIBLE.length / 2);
INDEX_ILLEGAL_CHARACTERS_VISIBLE.splice(insertionIndex, 0, ',');
