/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiPanel,
  EuiSplitPanel,
  logicalCSS,
  useEuiMaxBreakpoint,
  useEuiMinBreakpoint,
  useEuiTheme,
} from '@elastic/eui';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { useHistory } from 'react-router-dom';
import { RuleDetailsActionsMenu } from './rule_details_actions_menu';
import { useBreadcrumbs } from '../../hooks/use_breadcrumbs';
import { useDeleteRule } from '../../hooks/use_delete_rule';
import { useComposeDiscoverFlyout } from '../../hooks/use_compose_discover_flyout';
import { DeleteConfirmationModal } from '../rule/modals/delete_confirmation_modal';
import { RuleHeaderDescription, RuleTitleWithBadges } from './rule_header_description';
import { RuleOverviewSection } from './overview';
import { RuleSidebar } from './sidebar/rule_sidebar';
import { useRule } from './rule_context';

export const RuleDetailPage: React.FunctionComponent = () => {
  const rule = useRule();
  useBreadcrumbs('rule_details', { ruleName: rule.metadata?.name });
  const { euiTheme } = useEuiTheme();

  const smallMediaQuery = useEuiMaxBreakpoint('s');
  const largeMediaQuery = useEuiMinBreakpoint('m');

  const history = useHistory();
  const { mutate: deleteRule, isLoading: isDeleting } = useDeleteRule();
  const { flyout, openEditFlyout, openCloneFlyout } = useComposeDiscoverFlyout();
  const [showDeleteConfirmation, setShowDeleteConfirmation] = React.useState(false);

  const showDeleteConfirmationModal = () => {
    setShowDeleteConfirmation(true);
  };

  const handleRuleDelete = () => {
    setShowDeleteConfirmation(false);
    deleteRule(
      { id: rule.id, name: rule.metadata.name },
      {
        onSuccess: () => {
          history.push('/');
        },
      }
    );
  };

  return (
    <KibanaPageTemplate
      paddingSize="none"
      bottomBorder={false}
      data-test-subj="alertingV2RuleDetailsPage"
      minHeight={0}
      grow={false}
      css={css`
        ${largeMediaQuery} {
          block-size: calc(var(--kbn-application--content-height, 100vh) - ${euiTheme.size.l} * 2);
        }
      `}
      pageHeader={{
        'data-test-subj': 'ruleDetailsTitle',
        pageTitle: <RuleTitleWithBadges />,
        description: <RuleHeaderDescription />,
        bottomBorder: true,
        restrictWidth: false,
        paddingSize: 'none',
        rightSideGroupProps: { gutterSize: 's' },
        rightSideItems: [
          <RuleDetailsActionsMenu
            key="actions"
            showDeleteConfirmation={showDeleteConfirmationModal}
            onClone={() => openCloneFlyout(rule)}
          />,
          <EuiButtonEmpty
            key="edit"
            aria-label={i18n.translate(
              'xpack.alertingV2.sections.ruleDetails.editRuleButtonLabel',
              { defaultMessage: 'Edit Rule' }
            )}
            data-test-subj="openEditRuleFlyoutButton"
            color="text"
            iconType="pencil"
            name="edit"
            onClick={() => openEditFlyout(rule)}
          >
            <FormattedMessage
              id="xpack.alertingV2.sections.ruleDetails.editRuleButtonLabel"
              defaultMessage="Edit Rule"
            />
          </EuiButtonEmpty>,
        ],
      }}
    >
      <KibanaPageTemplate.Section
        paddingSize="none"
        grow
        restrictWidth={false}
        css={css`
          min-height: 0;
        `}
        contentProps={{
          css: css`
            flex: 1 1;
            min-height: 0;
          `,
        }}
      >
        <EuiSplitPanel.Outer
          direction="row"
          hasBorder={false}
          hasShadow={false}
          data-test-subj="ruleDetailLayout"
          css={css`
            ${largeMediaQuery} {
              height: 100%;
            }
          `}
        >
          <EuiSplitPanel.Inner grow paddingSize="none" data-test-subj="ruleDetailOverviewColumn">
            <EuiPanel
              hasBorder={false}
              hasShadow={false}
              paddingSize="l"
              css={css`
                ${smallMediaQuery} {
                  ${logicalCSS('padding-horizontal', '0')}
                }
                ${largeMediaQuery} {
                  height: 100%;
                  overflow-y: auto;
                  ${logicalCSS('padding-left', '0')}
                }
              `}
            >
              <RuleOverviewSection />
            </EuiPanel>
          </EuiSplitPanel.Inner>
          <EuiSplitPanel.Inner
            grow={false}
            paddingSize="none"
            data-test-subj="ruleDetailSidebarColumn"
            css={css`
              min-height: 0;
              ${logicalCSS('padding-top', euiTheme.size.l)}

              ${largeMediaQuery} {
                ${logicalCSS('padding-top', '0')}
                flex-shrink: 0;
                flex-basis: 400px;
                min-width: 40px;
                max-width: 500px;
                height: 100%;
                overflow-y: auto;
                padding: ${euiTheme.size.l};
                border-left: ${euiTheme.border.thin};
              }
            `}
          >
            <RuleSidebar />
          </EuiSplitPanel.Inner>
        </EuiSplitPanel.Outer>
      </KibanaPageTemplate.Section>

      {showDeleteConfirmation && (
        <DeleteConfirmationModal
          onConfirm={handleRuleDelete}
          onCancel={() => setShowDeleteConfirmation(false)}
          ruleName={rule.metadata?.name ?? ''}
          isLoading={isDeleting}
        />
      )}
      {flyout}
    </KibanaPageTemplate>
  );
};
