/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import {
  EuiButton,
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPopover,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { useKibana } from '../../../../common/lib/kibana';

const ALERTING_V2_CREATE_PATH = '/app/management/insightsAndAlerting/alerting_v2/create';

export interface CreateRuleButtonProps {
  openFlyout: () => void;
}

const splitGroupStyles = css`
  gap: 1px;

  .splitButton__primary {
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
  }

  .splitButton__dropdown {
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
    min-inline-size: 0;
    padding-inline: 8px;
  }
`;

export const CreateRuleButton = ({ openFlyout }: CreateRuleButtonProps) => {
  const { application, http } = useKibana().services;
  const canViewAlertingV2 = !!application.capabilities.alertingVTwo;

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  if (!canViewAlertingV2) {
    return (
      <EuiButton
        iconType="plusInCircle"
        key="create-rule"
        data-test-subj="createRuleButton"
        fill
        onClick={openFlyout}
      >
        <FormattedMessage
          id="xpack.triggersActionsUI.sections.rulesList.addRuleButtonLabel"
          defaultMessage="Create rule"
        />
      </EuiButton>
    );
  }

  return (
    <EuiFlexGroup responsive={false} gutterSize="none" css={splitGroupStyles}>
      <EuiFlexItem grow={false}>
        <EuiButton
          className="splitButton__primary"
          iconType="plusInCircle"
          data-test-subj="createRuleButton"
          fill
          onClick={openFlyout}
        >
          <FormattedMessage
            id="xpack.triggersActionsUI.sections.rulesList.addRuleButtonLabel"
            defaultMessage="Create rule"
          />
        </EuiButton>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiPopover
          aria-label={i18n.translate(
            'xpack.triggersActionsUI.sections.rulesList.createRuleDropdownAriaLabel',
            { defaultMessage: 'More create rule options' }
          )}
          button={
            <EuiButtonIcon
              className="splitButton__dropdown"
              display="fill"
              size="m"
              iconType="arrowDown"
              aria-label={i18n.translate(
                'xpack.triggersActionsUI.sections.rulesList.createRuleDropdownAriaLabel',
                { defaultMessage: 'More create rule options' }
              )}
              onClick={() => setIsDropdownOpen((open) => !open)}
              data-test-subj="createRuleDropdownButton"
            />
          }
          isOpen={isDropdownOpen}
          closePopover={() => setIsDropdownOpen(false)}
          panelPaddingSize="none"
          anchorPosition="downRight"
        >
          <EuiContextMenuPanel
            size="s"
            items={[
              <EuiContextMenuItem
                key="create-v2-rule"
                icon={<EuiIcon type="bell" size="m" aria-hidden={true} />}
                href={http.basePath.prepend(ALERTING_V2_CREATE_PATH)}
                data-test-subj="createV2RuleButton"
              >
                {i18n.translate('xpack.triggersActionsUI.sections.rulesList.createV2RuleLabel', {
                  defaultMessage: 'Create v2 Rule',
                })}
              </EuiContextMenuItem>,
            ]}
          />
        </EuiPopover>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
