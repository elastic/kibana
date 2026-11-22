/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButtonEmpty,
  EuiPageHeader,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { matchPath, useLocation } from 'react-router-dom';
import { useInvestigationBreadcrumbs, useInvestigationsNavigation } from '../../hooks';
import { ICONS } from '../../icons';
import { SETTINGS_PATH, TASK_LIST_PATH_PATTERN, TEMPLATES_PATH } from './paths';
import { StatusesTab } from './statuses_tab';
import { TemplatesTab } from './templates_tab';
import * as i18n from './translations';

/**
 * `/settings`: the status list and pause reasons of the space. `/settings/templates` lists the
 * investigation templates, and `/settings/templates/:templateId/tasks` opens a template's task list.
 */
export const SettingsPage: React.FC = () => {
  const { euiTheme } = useEuiTheme();
  const { goToQueue, navigate, getHref } = useInvestigationsNavigation();
  const { pathname } = useLocation();

  useInvestigationBreadcrumbs(i18n.PAGE_TITLE);

  const isTemplates = pathname.startsWith(TEMPLATES_PATH);
  const taskListTemplateId =
    matchPath<{ templateId: string }>(pathname, { path: TASK_LIST_PATH_PATTERN, exact: true })
      ?.params.templateId ?? undefined;

  return (
    <div
      css={css`
        height: 100%;
        overflow-y: auto;
        padding: ${euiTheme.size.l};
      `}
      data-test-subj="investigationsSettingsPage"
    >
      <EuiButtonEmpty
        size="s"
        flush="left"
        iconType={ICONS.chevronLeft}
        aria-label={i18n.BACK_TO_QUEUE_ARIA}
        onClick={goToQueue}
        data-test-subj="investigationsSettingsBack"
      >
        {i18n.BACK_TO_QUEUE}
      </EuiButtonEmpty>
      <EuiPageHeader
        pageTitle={i18n.PAGE_TITLE}
        description={i18n.PAGE_DESCRIPTION}
        bottomBorder={false}
      />
      <EuiTabs data-test-subj="investigationsSettingsTabs" aria-label={i18n.TABS_ARIA}>
        <EuiTab
          isSelected={!isTemplates}
          href={getHref(SETTINGS_PATH)}
          onClick={(event: React.MouseEvent) => {
            event.preventDefault();
            navigate(SETTINGS_PATH);
          }}
          data-test-subj="investigationsSettingsTabStatuses"
        >
          {i18n.TAB_STATUSES}
        </EuiTab>
        <EuiTab
          isSelected={isTemplates}
          href={getHref(TEMPLATES_PATH)}
          onClick={(event: React.MouseEvent) => {
            event.preventDefault();
            navigate(TEMPLATES_PATH);
          }}
          data-test-subj="investigationsSettingsTabTemplates"
        >
          {i18n.TAB_TEMPLATES}
        </EuiTab>
      </EuiTabs>
      <EuiSpacer size="l" />
      {isTemplates ? <TemplatesTab taskListTemplateId={taskListTemplateId} /> : <StatusesTab />}
    </div>
  );
};
SettingsPage.displayName = 'SettingsPage';
