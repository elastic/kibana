/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IconType } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export type UniversalRuleCreateOptionId = 'threshold' | 'sequence' | 'esql';

export interface UniversalRuleCreateOption {
  readonly id: UniversalRuleCreateOptionId;
  readonly title: string;
  readonly description: string;
  readonly iconType: IconType;
  readonly experimental?: boolean;
}

/**
 * Client-side catalog of Universal rule creation options in display order.
 * Shared by the create rule search Universal section and the options panel.
 */
export const UNIVERSAL_RULE_CREATE_OPTIONS: readonly UniversalRuleCreateOption[] = [
  {
    id: 'threshold',
    title: i18n.translate('xpack.alertingV2.universalRuleCreateOptions.thresholdTitle', {
      defaultMessage: 'Monitor a threshold',
    }),
    description: i18n.translate(
      'xpack.alertingV2.universalRuleCreateOptions.thresholdDescription',
      {
        defaultMessage: 'Guided builder for counts and metric thresholds',
      }
    ),
    iconType: 'puzzlePiece',
  },
  {
    id: 'sequence',
    title: i18n.translate('xpack.alertingV2.universalRuleCreateOptions.sequenceTitle', {
      defaultMessage: 'Build a sequence',
    }),
    description: i18n.translate('xpack.alertingV2.universalRuleCreateOptions.sequenceDescription', {
      defaultMessage: 'Guided builder for an ordered sequence of events',
    }),
    iconType: 'puzzlePiece',
    experimental: true,
  },
  {
    id: 'esql',
    title: i18n.translate('xpack.alertingV2.universalRuleCreateOptions.esqlTitle', {
      defaultMessage: 'Write ES|QL query',
    }),
    description: i18n.translate('xpack.alertingV2.universalRuleCreateOptions.esqlDescription', {
      defaultMessage: 'Write your own ES|QL query',
    }),
    iconType: 'code',
  },
];
