/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, Suspense } from 'react';
import type { IconType } from '@elastic/eui';
import {
  EuiButtonEmpty,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiText,
  EuiFlyoutHeader,
  EuiBetaBadge,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import type { SubFeature } from '@kbn/actions-plugin/common';
import { TECH_PREVIEW_DESCRIPTION, TECH_PREVIEW_LABEL } from '../../translations';
import { EditConnectorTabs } from '../../../../types';
import { useKibana } from '../../../../common/lib/kibana';
import { hasExecuteActionsCapability } from '../../../lib/capabilities';
import { ConnectorFormTabs } from '../connector_form_tabs';

const FlyoutHeaderComponent: React.FC<{
  isExperimental?: boolean;
  subFeature?: SubFeature;
  isPreconfigured: boolean;
  connectorName: string;
  connectorTypeDesc: string;
  selectedTab: EditConnectorTabs;
  setTab: (nextPage: EditConnectorTabs) => void;
  icon?: IconType | null;
  isTestable?: boolean;
  hideRulesTab?: boolean;
  /** Whether to show the Access tab, for stored connectors while object-level security is enabled. */
  showAccessTab?: boolean;
  docsUrl?: string;
}> = ({
  icon,
  isExperimental = false,
  subFeature,
  isPreconfigured,
  connectorName,
  connectorTypeDesc,
  selectedTab,
  setTab,
  isTestable,
  hideRulesTab = false,
  showAccessTab = false,
  docsUrl,
}) => {
  const {
    application: { capabilities },
  } = useKibana().services;

  const canExecute = hasExecuteActionsCapability(capabilities, subFeature);

  return (
    <EuiFlyoutHeader hasBorder data-test-subj="edit-connector-flyout-header">
      <EuiFlexGroup gutterSize="s" alignItems="center">
        {icon ? (
          <Suspense fallback={null}>
            <EuiFlexItem grow={false}>
              <EuiIcon
                type={icon}
                size="m"
                data-test-subj="edit-connector-flyout-header-icon"
                aria-hidden={true}
              />
            </EuiFlexItem>
          </Suspense>
        ) : null}
        <EuiFlexItem grow={false}>
          {isPreconfigured ? (
            <>
              <EuiFlexGroup gutterSize="s" alignItems="center" wrap={true}>
                <EuiFlexItem autoFocus={true} grow={false} style={{ minWidth: '200px' }}>
                  <EuiTitle size="s">
                    <h3 id="flyoutTitle">
                      <FormattedMessage
                        defaultMessage="{connectorName}"
                        id="xpack.triggersActionsUI.sections.preconfiguredConnectorForm.flyoutTitle"
                        values={{ connectorName }}
                      />
                    </h3>
                  </EuiTitle>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiBetaBadge
                    label="Preconfigured"
                    data-test-subj="preconfiguredBadge"
                    tooltipContent={i18n.translate(
                      'xpack.triggersActionsUI.sections.preconfiguredConnectorForm.tooltipContent',
                      {
                        defaultMessage: 'This connector is preconfigured and cannot be edited',
                      }
                    )}
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  {isExperimental && (
                    <EuiBetaBadge
                      label={TECH_PREVIEW_LABEL}
                      tooltipContent={TECH_PREVIEW_DESCRIPTION}
                    />
                  )}
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiText size="s">
                <FormattedMessage
                  defaultMessage="{connectorTypeDesc}"
                  id="xpack.triggersActionsUI.sections.editConnectorForm.actionTypeDescription"
                  values={{ connectorTypeDesc }}
                />
              </EuiText>
            </>
          ) : (
            <>
              <EuiFlexGroup gutterSize="s" alignItems="center" wrap={true}>
                <EuiFlexItem style={{ minWidth: '200px' }}>
                  <EuiTitle size="s">
                    <h3 id="flyoutTitle">
                      <FormattedMessage
                        defaultMessage="Edit connector"
                        id="xpack.triggersActionsUI.sections.editConnectorForm.flyoutPreconfiguredTitle"
                      />
                    </h3>
                  </EuiTitle>
                  <EuiText
                    size="s"
                    color="subdued"
                    data-test-subj="edit-connector-flyout-header-name"
                  >
                    <p>{connectorName}</p>
                  </EuiText>
                </EuiFlexItem>
                {isExperimental && (
                  <EuiFlexItem grow={false}>
                    <EuiBetaBadge
                      label={TECH_PREVIEW_LABEL}
                      tooltipContent={TECH_PREVIEW_DESCRIPTION}
                    />
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
            </>
          )}
        </EuiFlexItem>
        <EuiFlexItem grow={true} />
        {docsUrl && (
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              data-test-subj="edit-connector-flyout-header-docs-link"
              href={docsUrl}
              target="_blank"
              iconType="question"
            >
              <FormattedMessage
                id="xpack.triggersActionsUI.sections.editConnectorForm.flyoutHeaderDocsLink"
                defaultMessage="Documentation"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <ConnectorFormTabs
        selectedTab={selectedTab}
        setTab={setTab}
        tabs={[
          EditConnectorTabs.Configuration,
          ...(showAccessTab ? [EditConnectorTabs.Access] : []),
          ...(!hideRulesTab ? [EditConnectorTabs.Rules] : []),
          ...(isTestable && canExecute ? [EditConnectorTabs.Test] : []),
        ]}
      />
    </EuiFlyoutHeader>
  );
};

export const FlyoutHeader = memo(FlyoutHeaderComponent);
