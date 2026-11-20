/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiDescriptionList, EuiFlyoutBody, EuiFlyoutHeader, EuiTitle } from '@elastic/eui';
import type { CoreStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { toMountPoint } from '@kbn/react-kibana-mount';
import type { Exemplar } from './exemplars_overlay_provider';

const FLYOUT_TITLE_ID = 'metricsExemplarsFlyoutTitle';

const ExemplarFlyoutContent = ({ exemplar }: { exemplar: Exemplar }) => (
  <>
    <EuiFlyoutHeader hasBorder>
      <EuiTitle size="s">
        <h2 id={FLYOUT_TITLE_ID}>
          {i18n.translate('xpack.metricsExemplars.flyoutTitle', {
            defaultMessage: 'Exemplar',
          })}
        </h2>
      </EuiTitle>
    </EuiFlyoutHeader>
    <EuiFlyoutBody>
      <EuiDescriptionList
        type="row"
        compressed
        listItems={Object.entries(exemplar.fields)
          .filter(([, value]) => value != null)
          .map(([title, value]) => ({
            title,
            description: typeof value === 'object' ? JSON.stringify(value) : String(value),
          }))}
      />
    </EuiFlyoutBody>
  </>
);

/** Opens the exemplar in a core flyout, so it works on every surface rendering the chart. */
export const openExemplarFlyout = (core: CoreStart, exemplar: Exemplar): void => {
  core.overlays.openFlyout(toMountPoint(<ExemplarFlyoutContent exemplar={exemplar} />, core), {
    size: 's',
    'aria-labelledby': FLYOUT_TITLE_ID,
  });
};
