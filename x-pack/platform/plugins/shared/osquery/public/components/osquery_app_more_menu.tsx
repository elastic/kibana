/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { UseEuiTheme } from '@elastic/eui';
import {
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiPopover,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { INTEGRATIONS_PLUGIN_ID } from '@kbn/fleet-plugin/common';
import { pagePathGetters } from '@kbn/fleet-plugin/public';
import { isLeftClickEvent, isModifiedEvent, useKibana } from '../common/lib/kibana';
import { OSQUERY_INTEGRATION_NAME } from '../../common';

const MORE_ACTIONS_LABEL = i18n.translate('xpack.osquery.appMoreMenu.moreActionsButtonLabel', {
  defaultMessage: 'More actions',
});

const ADD_INTEGRATION_LABEL = i18n.translate('xpack.osquery.appMoreMenu.addIntegrationLabel', {
  defaultMessage: 'Add integration',
});

const DOCUMENTATION_LABEL = i18n.translate('xpack.osquery.appMoreMenu.documentationLabel', {
  defaultMessage: 'Documentation',
});

const FEEDBACK_LABEL = i18n.translate('xpack.osquery.appMoreMenu.feedbackLabel', {
  defaultMessage: 'Feedback',
});

const separatorCss = ({ euiTheme }: UseEuiTheme) => ({
  borderTop: euiTheme.border.thin,
  marginBlock: euiTheme.size.xs,
});

const OsqueryAppMoreMenuComponent = () => {
  const {
    application: { getUrlForApp, navigateToApp },
    chrome,
    docLinks,
  } = useKibana().services;
  const [isOpen, setIsOpen] = useState(false);
  const [docsHref, setDocsHref] = useState<string | undefined>();

  const closePopover = useCallback(() => setIsOpen(false), []);
  const togglePopover = useCallback(() => setIsOpen((open) => !open), []);

  const integrationPath = pagePathGetters.integration_details_policies({
    pkgkey: OSQUERY_INTEGRATION_NAME,
  })[1];
  const integrationHref = useMemo(
    () => getUrlForApp(INTEGRATIONS_PLUGIN_ID, { path: integrationPath }),
    [getUrlForApp, integrationPath]
  );

  useEffect(() => {
    const subscription = chrome.getHelpExtension$().subscribe((extension) => {
      const documentationLink = extension?.links?.find((link) => link.linkType === 'documentation');
      setDocsHref(documentationLink?.href);
    });

    return () => subscription.unsubscribe();
  }, [chrome]);

  const openIntegration = useCallback(
    (event: React.MouseEvent) => {
      if (!isModifiedEvent(event) && isLeftClickEvent(event)) {
        event.preventDefault();
        closePopover();
        navigateToApp(INTEGRATIONS_PLUGIN_ID, { path: integrationPath });
      }
    },
    [closePopover, integrationPath, navigateToApp]
  );

  const openFeedback = useCallback(() => {
    closePopover();
    const trigger = document.querySelector<HTMLButtonElement>(
      '[data-test-subj="feedbackTriggerButton"]'
    );
    if (trigger && !trigger.disabled) {
      trigger.click();
      return;
    }

    window.open(docLinks.links.kibana.feedback, '_blank', 'noopener');
  }, [closePopover, docLinks.links.kibana.feedback]);

  const documentationHref =
    docsHref ??
    `${docLinks.ELASTIC_WEBSITE_URL}guide/en/kibana/${docLinks.DOC_LINK_VERSION}/osquery.html`;

  const button = (
    <EuiButtonIcon
      iconType="ellipsis"
      color="text"
      size="s"
      aria-label={MORE_ACTIONS_LABEL}
      aria-haspopup="menu"
      aria-expanded={isOpen}
      onClick={togglePopover}
      isSelected={isOpen}
      data-test-subj="osquery-app-more-actions"
    />
  );

  return (
    <EuiPopover
      button={<EuiToolTip content={MORE_ACTIONS_LABEL}>{button}</EuiToolTip>}
      isOpen={isOpen}
      closePopover={closePopover}
      panelPaddingSize="none"
      anchorPosition="downRight"
    >
      <EuiContextMenuPanel>
        <EuiContextMenuItem
          icon="indexOpen"
          href={integrationHref}
          onClick={openIntegration}
          data-test-subj="osquery-app-add-integration"
        >
          {ADD_INTEGRATION_LABEL}
        </EuiContextMenuItem>
        <div css={separatorCss} />
        <EuiContextMenuItem
          icon="documentation"
          href={documentationHref}
          target="_blank"
          rel="noopener"
          onClick={closePopover}
          data-test-subj="osquery-app-documentation"
        >
          {DOCUMENTATION_LABEL}
        </EuiContextMenuItem>
        <EuiContextMenuItem
          icon="comment"
          onClick={openFeedback}
          data-test-subj="osquery-app-feedback"
        >
          {FEEDBACK_LABEL}
        </EuiContextMenuItem>
      </EuiContextMenuPanel>
    </EuiPopover>
  );
};

export const OsqueryAppMoreMenu = React.memo(OsqueryAppMoreMenuComponent);
