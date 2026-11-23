/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup } from '@kbn/core/public';
import {
  CASES_TEMPLATE_APPLIED_EVENT_TYPE,
  CASES_TEMPLATE_APPLIED_ON_CREATE_EVENT_TYPE,
  CASES_TEMPLATE_CLEARED_EVENT_TYPE,
} from '../../../common/constants';

/**
 * Registers the browser events for putting a template on a case and for taking it off again.
 * Managing templates themselves is a separate family with its own register module.
 *
 * Each event reports one confirmed UI action, never a count of cases: the public API, workflows, and
 * the cases system action all apply templates with no browser in the path, so use the server-side
 * counters for totals. The deprecated legacy case view is also not instrumented, so a template
 * changed there reports nothing.
 *
 * Wired from `registerAnalytics` rather than the templates barrel, to keep the two families in
 * separate files while both are in flight. Folding them together is a planned follow-up.
 */
export const registerTemplateApplyEvents = ({
  analyticsService,
}: {
  analyticsService: AnalyticsServiceSetup;
}) => {
  analyticsService.registerEventType({
    eventType: CASES_TEMPLATE_APPLIED_ON_CREATE_EVENT_TYPE,
    schema: {
      owner: {
        type: 'keyword',
        _meta: {
          description:
            'The solution ID (owner) of the case that was created from a template, or "unknown" ' +
            'when the case context carries no registered solution owner',
          optional: false,
        },
      },
      entry_point: {
        type: 'keyword',
        _meta: {
          description:
            'The bounded place in the UI the template was chosen from, currently always ' +
            '"create_form". Reported once the server confirms that the created case carries the ' +
            'template, so an abandoned create form reports nothing, and changing the selection ' +
            'several times before submitting still reports once. No template name, tag, author, ' +
            'or field value is reported',
          optional: false,
        },
      },
    },
  });

  analyticsService.registerEventType({
    eventType: CASES_TEMPLATE_APPLIED_EVENT_TYPE,
    schema: {
      owner: {
        type: 'keyword',
        _meta: {
          description:
            'The solution ID (owner) of the case the template was applied to, or "unknown" when ' +
            'the case context carries no registered solution owner',
          optional: false,
        },
      },
      entry_point: {
        type: 'keyword',
        _meta: {
          description:
            'The bounded case-view control the change was confirmed from, currently always ' +
            '"case_view_sidebar". The deprecated legacy case view is not instrumented, so a ' +
            'template changed from its apply-template modal reports nothing. No template name, ' +
            'tag, author, or field value is reported',
          optional: false,
        },
      },
      apply_mode: {
        type: 'keyword',
        _meta: {
          description:
            'Whether the case carried no template before this action ("initial") or carried a ' +
            'different one that this action replaced ("replacement"). Re-applying the template a ' +
            'case already has is not reported, because the sidebar returns early when the ' +
            'selection matches the applied template',
          optional: false,
        },
      },
    },
  });

  analyticsService.registerEventType({
    eventType: CASES_TEMPLATE_CLEARED_EVENT_TYPE,
    schema: {
      owner: {
        type: 'keyword',
        _meta: {
          description:
            'The solution ID (owner) of the case the template was removed from, or "unknown" when ' +
            'the case context carries no registered solution owner',
          optional: false,
        },
      },
      entry_point: {
        type: 'keyword',
        _meta: {
          description:
            'The bounded case-view control the removal was confirmed from, currently always ' +
            '"case_view_sidebar", whose confirmation modal has a remove mode. No template name, ' +
            'tag, author, or field value is reported',
          optional: false,
        },
      },
    },
  });
};
