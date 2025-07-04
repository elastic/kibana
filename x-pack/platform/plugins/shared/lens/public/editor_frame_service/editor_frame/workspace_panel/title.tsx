/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiScreenReaderOnly } from '@elastic/eui';
import { LensState, useLensSelector } from '../../../state_management';

export function WorkspaceTitle() {
  const title = useLensSelector((state: LensState) => state.lens.persistedDoc?.title);
  return (
    <EuiScreenReaderOnly>
      <h1 id="lns_ChartTitle" data-test-subj="lns_ChartTitle">
        {title ||
          i18n.translate('xpack.lens.chartTitle.unsaved', {
            defaultMessage: 'Unsaved visualization',
          })}
      </h1>
    </EuiScreenReaderOnly>
  );
}
