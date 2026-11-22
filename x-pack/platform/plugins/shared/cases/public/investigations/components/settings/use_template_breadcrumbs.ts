/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import type { ChromeBreadcrumb } from '@kbn/core/public';
import { INVESTIGATIONS_APP_ID } from '../../../../common/investigations/constants';
import { useInvestigationsServices } from '../../services';
import { APP_TITLE } from '../../translations';
import { SETTINGS_PATH, TEMPLATES_PATH } from './paths';
import * as i18n from './translations';

/**
 * Breadcrumbs of the template screens: Investigations > Investigation settings > Investigation
 * templates > the template.
 */
export const useTemplateBreadcrumbs = (templateName: string): void => {
  const { chrome, application } = useInvestigationsServices();
  const history = useHistory();

  useEffect(() => {
    const goTo = (path: string) => (event: React.MouseEvent) => {
      event.preventDefault();
      history.push(path);
    };
    const breadcrumbs: ChromeBreadcrumb[] = [
      {
        text: APP_TITLE,
        href: application.getUrlForApp(INVESTIGATIONS_APP_ID),
        onClick: goTo('/'),
      },
      {
        text: i18n.PAGE_TITLE,
        href: history.createHref({ pathname: SETTINGS_PATH }),
        onClick: goTo(SETTINGS_PATH),
      },
      {
        text: i18n.TAB_TEMPLATES,
        href: history.createHref({ pathname: TEMPLATES_PATH }),
        onClick: goTo(TEMPLATES_PATH),
      },
      { text: templateName },
    ];
    chrome.setBreadcrumbs(breadcrumbs);
    chrome.docTitle.change([templateName, i18n.TAB_TEMPLATES, APP_TITLE]);
  }, [application, chrome, history, templateName]);
};
