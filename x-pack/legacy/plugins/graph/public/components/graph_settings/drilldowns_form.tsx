/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { GraphSettingsProps } from './graph_settings';

export function DrilldownsForm(
  props: Pick<GraphSettingsProps, 'removeUrlTemplate' | 'saveUrlTemplate' | 'urlTemplates'>
) {
  return <div>Drilldowns</div>;
}
