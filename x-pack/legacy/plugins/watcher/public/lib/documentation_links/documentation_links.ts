/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ELASTIC_WEBSITE_URL, DOC_LINK_VERSION } from 'ui/documentation_links';
import { ACTION_TYPES } from '../../../common/constants';

const elasticDocLinkBase = `${ELASTIC_WEBSITE_URL}guide/en/`;

const esBase = `${elasticDocLinkBase}elasticsearch/reference/${DOC_LINK_VERSION}`;
const esStackBase = `${elasticDocLinkBase}elastic-stack-overview/${DOC_LINK_VERSION}`;
const kibanaBase = `${elasticDocLinkBase}kibana/${DOC_LINK_VERSION}`;

export const putWatchApiUrl = `${esBase}/watcher-api-put-watch.html`;
export const executeWatchApiUrl = `${esBase}/watcher-api-execute-watch.html#watcher-api-execute-watch-action-mode`;
export const watcherGettingStartedUrl = `${kibanaBase}/watcher-ui.html`;

export const watchActionsConfigurationMap = {
  [ACTION_TYPES.SLACK]: `${esStackBase}/actions-slack.html#configuring-slack`,
  [ACTION_TYPES.PAGERDUTY]: `${esStackBase}/actions-pagerduty.html#configuring-pagerduty`,
  [ACTION_TYPES.JIRA]: `${esStackBase}/actions-jira.html#configuring-jira`,
};
