/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React from 'react';
import { EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const strings = {
  getMultipleElementsActionsDescription: () =>
    i18n.translate('xpack.canvas.groupSettings.multipleElementsActionsDescription', {
      defaultMessage:
        'Deselect these elements to edit their individual settings, press ({gKey}) to group them, or save this selection as a new ' +
        'element to re-use it throughout your workpad.',
      values: {
        gKey: 'G',
      },
    }),
  getMultipleElementsDescription: () =>
    i18n.translate('xpack.canvas.groupSettings.multipleElementsDescription', {
      defaultMessage: 'Multiple elements are currently selected.',
    }),
};

export const MultiElementSettings: FunctionComponent = () => (
  <div className="canvasSidebar__panel canvasSidebar__panel--isEmpty">
    <EuiText size="s">
      <p>{strings.getMultipleElementsDescription()}</p>
      <p>{strings.getMultipleElementsActionsDescription()}</p>
    </EuiText>
  </div>
);
