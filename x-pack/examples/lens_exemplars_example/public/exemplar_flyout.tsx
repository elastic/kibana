/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiDescriptionList,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiTitle,
} from '@elastic/eui';
import type { CoreStart } from '@kbn/core/public';
import { toMountPoint } from '@kbn/react-kibana-mount';
import type { Exemplar } from './exemplars_overlay_provider';

const FLYOUT_TITLE_ID = 'lensExemplarsExampleFlyoutTitle';

const ExemplarFlyoutContent = ({ exemplar }: { exemplar: Exemplar }) => (
  <>
    <EuiFlyoutHeader hasBorder>
      <EuiTitle size="s">
        <h2 id={FLYOUT_TITLE_ID}>Exemplar</h2>
      </EuiTitle>
      {exemplar.simulated && <EuiBadge color="hollow">Simulated</EuiBadge>}
    </EuiFlyoutHeader>
    <EuiFlyoutBody>
      <EuiDescriptionList
        type="row"
        compressed
        listItems={Object.entries(exemplar.fields)
          .filter(([, value]) => value != null)
          .map(([title, value]) => ({ title, description: String(value) }))}
      />
    </EuiFlyoutBody>
  </>
);

/** Opens the exemplar details in a core flyout, so it works on every surface rendering the chart. */
export const openExemplarFlyout = (core: CoreStart, exemplar: Exemplar): void => {
  core.overlays.openFlyout(toMountPoint(<ExemplarFlyoutContent exemplar={exemplar} />, core), {
    size: 's',
    'aria-labelledby': FLYOUT_TITLE_ID,
  });
};
