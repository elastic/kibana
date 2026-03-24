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
  getSaveGroupDescription: () =>
    i18n.translate('xpack.canvas.groupSettings.saveGroupDescription', {
      defaultMessage: 'Save this group as a new element to re-use it throughout your workpad.',
    }),
  getUngroupDescription: () =>
    i18n.translate('xpack.canvas.groupSettings.ungroupDescription', {
      defaultMessage: 'Ungroup ({uKey}) to edit individual element settings.',
      values: {
        uKey: 'U',
      },
    }),
};

export const GroupSettings: FunctionComponent = () => (
  <div className="canvasSidebar__panel canvasSidebar__panel--isEmpty">
    <EuiText size="s">
      <p>{strings.getUngroupDescription()}</p>
      <p>{strings.getSaveGroupDescription()}</p>
    </EuiText>
  </div>
);
