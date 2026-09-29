/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText } from '@elastic/eui';
import type { CasesTourStep } from '../../tour/types';
import { TEMPLATES_TOUR_ANCHORS } from './constants';
import * as i18n from './translations';

const wrap = (text: string) => (
  <EuiText size="s">
    <p>{text}</p>
  </EuiText>
);

export const TEMPLATES_TOUR_STEPS: CasesTourStep[] = [
  {
    stepId: 'create',
    title: i18n.STEP_CREATE_TITLE,
    anchor: TEMPLATES_TOUR_ANCHORS.create,
    anchorPosition: 'downRight',
    content: wrap(i18n.STEP_CREATE_DESCRIPTION),
  },
  {
    stepId: 'fieldLibrary',
    title: i18n.STEP_FIELD_LIBRARY_TITLE,
    anchor: TEMPLATES_TOUR_ANCHORS.fieldLibrary,
    anchorPosition: 'downCenter',
    content: wrap(i18n.STEP_FIELD_LIBRARY_DESCRIPTION),
  },
];
