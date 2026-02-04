/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiContextMenuItem } from '@elastic/eui';
import type { AdditionalContext, AlertActionsProps } from '../types';
import { typedMemo } from '../utils/react';
import { useIndividualTagsActionContext } from '../contexts/individual_tags_action_context';

export const EditTagsAction = typedMemo(
  <AC extends AdditionalContext = AdditionalContext>({
    alert,
    onActionExecuted,
  }: AlertActionsProps<AC>) => {
    const { openFlyout } = useIndividualTagsActionContext();

    const handleOpenFlyout = useCallback(() => {
      openFlyout([alert]);
      onActionExecuted?.(); // this will close the popover containing this action
    }, [alert, openFlyout, onActionExecuted]);

    return (
      <EuiContextMenuItem
        data-test-subj="editTags"
        key="editTags"
        size="s"
        onClick={handleOpenFlyout}
      >
        {i18n.translate('xpack.responseOpsAlertsTable.actions.editTags', {
          defaultMessage: 'Edit tags',
        })}
      </EuiContextMenuItem>
    );
  }
);
