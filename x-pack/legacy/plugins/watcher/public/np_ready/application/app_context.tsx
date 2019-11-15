/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { createContext, useContext } from 'react';
import { DocLinksStart } from 'src/core/public';
import { ACTION_TYPES } from '../../../common/constants';
import { AppDeps } from './app';

interface ContextValue extends Omit<AppDeps, 'docLinks'> {
  links: ReturnType<typeof generateDocLinks>;
}

const AppContext = createContext<ContextValue>(null as any);

const generateDocLinks = ({ ELASTIC_WEBSITE_URL, DOC_LINK_VERSION }: DocLinksStart) => {
  const elasticDocLinkBase = `${ELASTIC_WEBSITE_URL}guide/en/`;
  const esBase = `${elasticDocLinkBase}elasticsearch/reference/${DOC_LINK_VERSION}`;
  const kibanaBase = `${elasticDocLinkBase}kibana/${DOC_LINK_VERSION}`;
  const putWatchApiUrl = `${esBase}/watcher-api-put-watch.html`;
  const executeWatchApiUrl = `${esBase}/watcher-api-execute-watch.html#watcher-api-execute-watch-action-mode`;
  const watcherGettingStartedUrl = `${kibanaBase}/watcher-ui.html`;
  const watchActionsConfigurationMap = {
    [ACTION_TYPES.SLACK]: `${esBase}/actions-slack.html#configuring-slack`,
    [ACTION_TYPES.PAGERDUTY]: `${esBase}/actions-pagerduty.html#configuring-pagerduty`,
    [ACTION_TYPES.JIRA]: `${esBase}/actions-jira.html#configuring-jira`,
  };

  return {
    putWatchApiUrl,
    executeWatchApiUrl,
    watcherGettingStartedUrl,
    watchActionsConfigurationMap,
  };
};

export const AppContextProvider = ({
  children,
  value,
}: {
  value: AppDeps;
  children: React.ReactNode;
}) => {
  const { docLinks, ...rest } = value;
  return (
    <AppContext.Provider
      value={Object.freeze({
        ...rest,
        links: generateDocLinks(docLinks),
      })}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('"useAppContext" can only be called inside of AppContext.Provider!');
  }
  return ctx;
};
