/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiButton,
  EuiFlexItem,
  EuiIcon,
  EuiPopover,
  EuiPopoverTitle,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { ProjectPickerContent, useFetchProjects } from '@kbn/cps-utils';
import type { ProjectRouting } from '@kbn/es-query';
import { useRuleFormServices } from '../../form/contexts/rule_form_context';

const CPS_BUTTON_ARIA_LABEL = i18n.translate(
  'xpack.alertingV2.composeDiscover.querySandbox.cpsPickerAriaLabel',
  { defaultMessage: 'Cross-Project Search (CPS) is active' }
);

const CPS_DESCRIPTION = i18n.translate(
  'xpack.alertingV2.composeDiscover.querySandbox.cpsDescription',
  {
    defaultMessage:
      'Unless overridden in the ES|QL query, rules will use your space default project routing settings.',
  }
);

export const CpsPicker = () => {
  const { cps } = useRuleFormServices();
  const cpsManager = cps?.cpsManager;

  const cpsDefaultRouting = cpsManager?.getDefaultProjectRouting();
  const fetchCpsProjects = useCallback(
    (routing?: ProjectRouting) => cpsManager?.fetchProjects(routing) ?? Promise.resolve(null),
    [cpsManager]
  );
  const cpsProjects = useFetchProjects(fetchCpsProjects, cpsDefaultRouting);

  const [isOpen, setIsOpen] = useState(false);

  if ((cpsManager?.getTotalProjectCount() ?? 0) <= 1) {
    return null;
  }

  return (
    <EuiFlexItem grow={false}>
      <EuiPopover
        button={
          <EuiToolTip title={CPS_BUTTON_ARIA_LABEL} content={CPS_DESCRIPTION}>
            <EuiButton
              color="text"
              aria-label={CPS_BUTTON_ARIA_LABEL}
              onClick={() => setIsOpen((open) => !open)}
              size="s"
              data-test-subj="querySandboxCpsPicker"
              minWidth={0}
            >
              <EuiIcon type="crossProjectSearch" aria-hidden={true} />
            </EuiButton>
          </EuiToolTip>
        }
        isOpen={isOpen}
        closePopover={() => setIsOpen(false)}
        panelPaddingSize="none"
        anchorPosition="downLeft"
        ownFocus
        aria-label={i18n.translate(
          'xpack.alertingV2.composeDiscover.querySandbox.cpsPickerPopoverAriaLabel',
          { defaultMessage: 'CPS settings' }
        )}
      >
        <EuiPopoverTitle paddingSize="s">
          <FormattedMessage
            id="xpack.alertingV2.composeDiscover.querySandbox.cpsPickerTitle"
            defaultMessage="Default CPS project routing settings from your space"
          />
          <EuiText size="xs" color="subdued">
            <FormattedMessage
              id="xpack.alertingV2.composeDiscover.querySandbox.cpsPickerSubtitle"
              defaultMessage="Unless overridden in the ES|QL query, this routing will apply to rule
            query executions."
            />
          </EuiText>
        </EuiPopoverTitle>
        <ProjectPickerContent
          projectRouting={cpsDefaultRouting}
          onProjectRoutingChange={() => {}}
          projects={cpsProjects}
          controlsState="disabled"
        />
      </EuiPopover>
    </EuiFlexItem>
  );
};
