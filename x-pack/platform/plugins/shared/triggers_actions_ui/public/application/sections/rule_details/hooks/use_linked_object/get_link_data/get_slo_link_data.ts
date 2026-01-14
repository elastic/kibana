/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { sloDetailsLocatorID } from '@kbn/deeplinks-observability';
import type { Rule } from '../../../../../..';

const getSLOLinkData = (rule: Rule) => {
  return typeof rule.params.sloId === 'string'
    ? {
        urlParams: { sloId: rule.params.sloId },
        buttonText: i18n.translate(
          'xpack.triggersActionsUI.sections.ruleDetails.viewLinkedSloButtonText',
          {
            defaultMessage: 'View linked SLO',
          }
        ),
        locatorId: sloDetailsLocatorID,
      }
    : { urlParams: undefined, buttonText: '', locatorId: '' };
};

export { getSLOLinkData };
