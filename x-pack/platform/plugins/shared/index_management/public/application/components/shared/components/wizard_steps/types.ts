/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Mappings, IndexSettings, Aliases } from '../../../../../../common';

export interface CommonWizardSteps {
  settings?: IndexSettings;
  mappings?: Mappings;
  aliases?: Aliases;
}
