/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import AdmZip from 'adm-zip';
import { ExtractError } from './extract_error';

export async function unzip(filepath: string, target: string) {
  try {
    const zip = new AdmZip(filepath);
    await zip.extractAllToAsync(target, /* overwrite */ true, /* keepOriginalPermission */ true);
  } catch (err) {
    throw new ExtractError(err);
  }
}
