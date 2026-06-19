/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DocLinksStart } from '@kbn/core-doc-links-browser';
import { i18n } from '@kbn/i18n';

/** TODO: replace with links.alerting.v2Guide when Alerting v2 docs ship in kbn-doc-links. */
const ALERTING_V2_DOCS_PLACEHOLDER =
  'https://www.elastic.co/docs/explore-analyze/alerts-cases/alerts/alerting-v2';

export interface WhyV2DocLink {
  id: string;
  title: string;
  description: string;
  linkLabel: string;
  href: string;
  dataTestSubj: string;
}

/** Footer doc links — update hrefs via docLinks or swap entries as v2 docs ship. */
export const getWhyV2DocLinks = (links: DocLinksStart['links']): WhyV2DocLink[] => [
  {
    id: 'alerting-v2-guide',
    title: i18n.translate('xpack.alertingV2.whyV2.docs.alertingV2Guide.title', {
      defaultMessage: 'Alerting v2 documentation',
    }),
    description: i18n.translate('xpack.alertingV2.whyV2.docs.alertingV2Guide.description', {
      defaultMessage:
        'Learn about ES|QL-first rules, append-only rule events, episodes, action policies, and the v2 notification dispatcher.',
    }),
    linkLabel: i18n.translate('xpack.alertingV2.whyV2.docs.alertingV2Guide.linkLabel', {
      defaultMessage: 'View Alerting v2 documentation',
    }),
    href: ALERTING_V2_DOCS_PLACEHOLDER,
    dataTestSubj: 'whyV2Docs-alertingV2Guide',
  },
  {
    id: 'esql',
    title: i18n.translate('xpack.alertingV2.whyV2.docs.esql.title', {
      defaultMessage: 'ES|QL documentation',
    }),
    description: i18n.translate('xpack.alertingV2.whyV2.docs.esql.description', {
      defaultMessage:
        'Query and analyze Elasticsearch data with the piped query language that powers v2 rule definitions.',
    }),
    linkLabel: i18n.translate('xpack.alertingV2.whyV2.docs.esql.linkLabel', {
      defaultMessage: 'View ES|QL documentation',
    }),
    href: links.query.queryESQL,
    dataTestSubj: 'whyV2Docs-esql',
  },
  {
    id: 'workflows-actions',
    title: i18n.translate('xpack.alertingV2.whyV2.docs.workflowsActions.title', {
      defaultMessage: 'Workflows, actions, and connectors',
    }),
    description: i18n.translate('xpack.alertingV2.whyV2.docs.workflowsActions.description', {
      defaultMessage:
        'Run multi-step response in Workflows. Action policies decouple notifications from rules, with Connectors v2 support for each step.',
    }),
    linkLabel: i18n.translate('xpack.alertingV2.whyV2.docs.workflowsActions.linkLabel', {
      defaultMessage: 'Browse connectors',
    }),
    href: links.alerting.connectors,
    dataTestSubj: 'whyV2Docs-workflowsActions',
  },
];
