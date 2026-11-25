/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { StepExposure } from '@kbn/workflows-extensions/common';
import { buildStabilityBadgeHtml } from '../stability/get_stability_badge_html';
import { getStabilityBadgeColors } from '../stability/stability_badge_theme';

/** Returns the hover badge for `internal` and `managed_only` steps, styled like the stability badges, or `''` for `open` steps. */
export const getStepExposureBadgeHtml = (exposure: StepExposure = 'open'): string => {
  if (exposure === 'open') {
    return '';
  }
  const label = i18n.translate('workflows.stepExposure.internalBadge', {
    defaultMessage: 'Internal',
  });
  return buildStabilityBadgeHtml(label, getStabilityBadgeColors());
};

/** Returns the hover text that explains an `internal` or `managed_only` step, or `undefined` for `open` steps. */
export const getStepExposureDescription = (exposure: StepExposure = 'open'): string | undefined => {
  if (exposure === 'internal') {
    return i18n.translate('workflows.stepExposure.internalDescription', {
      defaultMessage:
        'This step is meant for managed workflows. You can use it in custom workflows at your own risk: its inputs, outputs and behavior can change without notice.',
    });
  }
  if (exposure === 'managed_only') {
    return i18n.translate('workflows.stepExposure.managedOnlyDescription', {
      defaultMessage:
        "This step is meant for managed workflows and can't be used in custom workflows.",
    });
  }
  return undefined;
};
