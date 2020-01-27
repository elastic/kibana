/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import chrome from 'ui/chrome';

import { useKibana } from '../../lib/kibana';
import { EmptyPage } from '../../components/empty_page';
import * as i18n from '../common/translations';

const basePath = chrome.getBasePath();

export const NetworkEmptyPage = React.memo(() => {
  const docLinks = useKibana().services.docLinks;

  return (
    <EmptyPage
      actionPrimaryIcon="gear"
      actionPrimaryLabel={i18n.EMPTY_ACTION_PRIMARY}
      actionPrimaryUrl={`${basePath}/app/kibana#/home/tutorial_directory/siem`}
      actionSecondaryIcon="popout"
      actionSecondaryLabel={i18n.EMPTY_ACTION_SECONDARY}
      actionSecondaryTarget="_blank"
      actionSecondaryUrl={docLinks.links.siem.gettingStarted}
      data-test-subj="empty-page"
      title={i18n.EMPTY_TITLE}
      message={i18n.EMPTY_MESSAGE}
    />
  );
});

NetworkEmptyPage.displayName = 'NetworkEmptyPage';
