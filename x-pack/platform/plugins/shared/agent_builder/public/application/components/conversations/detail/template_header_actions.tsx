/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiButtonEmpty, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import React from 'react';
import type { TemplateHeaderAction } from './template_conversation_utils';

interface TemplateHeaderActionsProps {
  actions: TemplateHeaderAction[];
}

export const TemplateHeaderActions: React.FC<TemplateHeaderActionsProps> = ({ actions }) => {
  if (actions.length === 0) {
    return null;
  }

  return (
    <>
      {actions.map((action) => {
        const ButtonComponent = action.buttonType === 'primary' ? EuiButton : EuiButtonEmpty;
        const button = (
          <ButtonComponent iconType={action.iconType} size="s" isDisabled={!action.enabled}>
            {action.label}
          </ButtonComponent>
        );

        return (
          <EuiFlexItem grow={false} key={action.id}>
            {action.tooltip ? <EuiToolTip content={action.tooltip}>{button}</EuiToolTip> : button}
          </EuiFlexItem>
        );
      })}
    </>
  );
};
