/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FlyoutTemplate } from '@kbn/flyout-template';
import type { ObservableFlyoutPanelProps } from '../../use_observable_flyout_api';
import { ObservableCasesTable } from './observable_cases_table';
import * as i18n from '../../translations';

/** The cases tool of the observable flyout: the other cases holding the observable. */
export const ObservableCasesTool = ({
  observable,
  caseData,
  typeLabel,
  onClose,
}: ObservableFlyoutPanelProps) => (
  <FlyoutTemplate onClose={onClose}>
    <FlyoutTemplate.Header
      title={i18n.OBSERVABLE_CASES_TITLE}
      description={`${typeLabel ?? observable.typeKey}: ${observable.value}`}
    />
    <FlyoutTemplate.Body>
      <ObservableCasesTable observable={observable} caseData={caseData} />
    </FlyoutTemplate.Body>
  </FlyoutTemplate>
);

ObservableCasesTool.displayName = 'ObservableCasesTool';
