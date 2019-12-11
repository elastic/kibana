/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import chrome from 'ui/chrome';

import { useKibanaCore } from '../../lib/compose/kibana_core';
import { EmptyPage } from '../../components/empty_page';
import * as i18n from './translations';

const basePath = chrome.getBasePath();

export const DetectionEngineEmptyPage = React.memo(() => {
  const { docLinks } = useKibanaCore();

  return (
    <EmptyPage
      actionPrimaryIcon="gear"
      actionPrimaryLabel={i18n.EMPTY_ACTION_PRIMARY}
      actionPrimaryUrl={`${basePath}/app/kibana#/home/tutorial_directory/siem`}
      actionSecondaryIcon="popout"
      actionSecondaryLabel={i18n.EMPTY_ACTION_SECONDARY}
      actionSecondaryTarget="_blank"
      actionSecondaryUrl={docLinks.links.siem}
      data-test-subj="empty-page"
      title={i18n.EMPTY_TITLE}
    />
  );
});
DetectionEngineEmptyPage.displayName = 'DetectionEngineEmptyPage';
