/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIllustration,
  EuiLink,
  EuiTitle,
} from '@elastic/eui';
import { featurePackedBox } from '@elastic/eui-illustrations';
import { CoreStart, useService } from '@kbn/core-di-browser';
import { FormattedMessage } from '@kbn/i18n-react';

const INTEGRATIONS_APP_ID = 'integrations';

/** Placeholder until rule library docs URL is finalized. */
export const RULE_LIBRARY_EMPTY_STATE_DOC_URL = '#' as const;

/**
 * Empty state for the rule library list — same layout as action policies,
 * with a primary button linking to Integrations.
 */
export const RuleLibraryEmptyState = () => {
  const application = useService(CoreStart('application'));
  const integrationsHref = application.getUrlForApp(INTEGRATIONS_APP_ID);

  return (
    <EuiFlexGroup justifyContent="center" alignItems="center" style={{ minHeight: '60vh' }}>
      <EuiFlexItem grow={false}>
        <EuiEmptyPrompt
          data-test-subj="ruleLibraryEmptyPrompt"
          layout="horizontal"
          color="plain"
          icon={
            <EuiIllustration
              type={featurePackedBox}
              alt=""
              style={{ maxInlineSize: 240, marginInline: 'auto' }}
              data-test-subj="ruleLibraryEmptyIllustration"
            />
          }
          title={
            <h2 style={{ whiteSpace: 'nowrap' }}>
              <FormattedMessage
                id="xpack.alertingV2.ruleLibrary.emptyState.title"
                defaultMessage="Get started with rule templates"
              />
            </h2>
          }
          body={
            <p>
              <FormattedMessage
                id="xpack.alertingV2.ruleLibrary.emptyState.description"
                defaultMessage="Rule templates are provided by Fleet integrations. Update or install integrations to view available rule templates."
              />
            </p>
          }
          actions={
            <EuiButton
              color="primary"
              fill
              href={integrationsHref}
              iconType="plugs"
              data-test-subj="ruleLibraryEmptyStateIntegrationsButton"
            >
              <FormattedMessage
                id="xpack.alertingV2.ruleLibrary.emptyState.integrationsButton"
                defaultMessage="Go to Integrations"
              />
            </EuiButton>
          }
          footer={
            <>
              <EuiTitle size="xxs">
                <span>
                  <FormattedMessage
                    id="xpack.alertingV2.ruleLibrary.emptyState.footerTitle"
                    defaultMessage="Need help?"
                  />
                </span>
              </EuiTitle>{' '}
              <EuiLink
                href={RULE_LIBRARY_EMPTY_STATE_DOC_URL}
                target="_blank"
                external
                data-test-subj="ruleLibraryEmptyStateDocLink"
              >
                <FormattedMessage
                  id="xpack.alertingV2.ruleLibrary.emptyState.footerLink"
                  defaultMessage="Read documentation"
                />
              </EuiLink>
            </>
          }
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
