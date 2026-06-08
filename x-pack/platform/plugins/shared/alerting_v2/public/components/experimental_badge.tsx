/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBetaBadge } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const EXPERIMENTAL_LABEL = i18n.translate('xpack.alertingV2.experimentalBadge.label', {
  defaultMessage: 'Experimental feature',
});

const EXPERIMENTAL_TOOLTIP = i18n.translate('xpack.alertingV2.experimentalBadge.tooltip', {
  defaultMessage:
    'This functionality is experimental and may be changed or removed completely in a future release. Elastic will work to fix any issues, but experimental features are not subject to the support SLA of official GA features.',
});

export const ExperimentalBadge = () => (
  <EuiBetaBadge
    label={EXPERIMENTAL_LABEL}
    tooltipContent={EXPERIMENTAL_TOOLTIP}
    tooltipPosition="bottom"
    data-test-subj="alertingV2ExperimentalBadge"
  />
);
