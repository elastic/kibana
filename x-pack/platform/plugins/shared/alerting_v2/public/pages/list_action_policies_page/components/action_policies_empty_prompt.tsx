/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import {
  EuiButton,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiImage,
  EuiLink,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import illustration from '../../../assets/centralized_action_policies.svg';

// TODO: replace with docLinks.links.alerting.actionPolicies once a dedicated
// key is added to kbn-doc-links.
const ACTION_POLICIES_DOCS_URL = 'https://www.elastic.co/docs/explore-analyze/alerts-cases/alerts';

const TITLE = i18n.translate('xpack.alertingV2.actionPoliciesList.emptyPrompt.title', {
  defaultMessage: 'Centralize your notifications',
});

const DESCRIPTION = i18n.translate('xpack.alertingV2.actionPoliciesList.emptyPrompt.description', {
  defaultMessage:
    'Create Action Policies to manage notification destinations once and reuse them across your rules.',
});

const CREATE_LABEL = i18n.translate(
  'xpack.alertingV2.actionPoliciesList.emptyPrompt.createPolicyButton',
  { defaultMessage: 'Create policy' }
);

const LEARN_MORE = i18n.translate('xpack.alertingV2.actionPoliciesList.emptyPrompt.learnMore', {
  defaultMessage: 'Want to learn more?',
});

const DOCS_LINK = i18n.translate('xpack.alertingV2.actionPoliciesList.emptyPrompt.docsLink', {
  defaultMessage: 'Read the docs',
});

const ILLUSTRATION_ALT = i18n.translate(
  'xpack.alertingV2.actionPoliciesList.emptyPrompt.illustrationAlt',
  { defaultMessage: 'Illustration of centralized Action Policies' }
);

/** Approximate AppHeader + spacer below chrome headers. */
const PAGE_CHROME_OFFSET = '140px';

interface Props {
  canWrite: boolean;
  onCreate: () => void;
}

export const ActionPoliciesEmptyPrompt = ({ canWrite, onCreate }: Props) => (
  <EuiFlexGroup
    alignItems="center"
    justifyContent="center"
    css={css`
      min-block-size: calc(var(--kbn-application--content-height, 100vh) - ${PAGE_CHROME_OFFSET});
    `}
  >
    <EuiFlexItem grow={false}>
      <EuiEmptyPrompt
        data-test-subj="actionPoliciesEmptyPrompt"
        color="plain"
        css={css`
          && {
            max-width: 400px;
          }
        `}
        icon={<EuiImage size="fullWidth" src={illustration} alt={ILLUSTRATION_ALT} />}
        title={<h2>{TITLE}</h2>}
        body={<p>{DESCRIPTION}</p>}
        actions={
          canWrite ? (
            <EuiButton
              color="primary"
              fill
              iconType="plusInCircle"
              onClick={onCreate}
              data-test-subj="actionPoliciesEmptyPromptCreateButton"
            >
              {CREATE_LABEL}
            </EuiButton>
          ) : undefined
        }
        footer={
          <>
            <EuiTitle size="xxs">
              <span>{LEARN_MORE}</span>
            </EuiTitle>{' '}
            <EuiLink
              href={ACTION_POLICIES_DOCS_URL}
              target="_blank"
              external
              data-test-subj="actionPoliciesEmptyPromptDocsLink"
            >
              {DOCS_LINK}
            </EuiLink>
          </>
        }
      />
    </EuiFlexItem>
  </EuiFlexGroup>
);
