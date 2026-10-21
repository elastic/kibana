/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { oneLine } from '../../lib';

/** What a reader sees in place of an image that can't be shown: its name, marked as an image. */
export const imageLabel = ({ alt, name }: { alt: string; name?: string }): string =>
  `Image: ${oneLine(name ?? alt)}`;
