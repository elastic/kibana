/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useContext, useCallback, useEffect, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiTitle,
  EuiFlyoutHeader,
  EuiFlyout,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ActionsContext } from '../../context/actions_context';
import { ActionForm } from './action_form';
import { useAppDependencies } from '../../app_dependencies';
import { getActionById } from '../../lib/api';
import { Action } from '../../../types';
import { SectionLoading } from '../../components/section_loading';

export const ActionEditFlyout = () => {
  const {
    core: { http },
    plugins: { toastNotifications },
    actionTypeRegistry,
  } = useAppDependencies();
  const { editFlyoutVisible, setEditFlyoutVisibility, editedActionItem } = useContext(
    ActionsContext
  );
  const [isLoadingAction, setIsLoadingAction] = useState<boolean>(false);
  const [action, setAction] = useState<Action | undefined>(undefined);

  const closeFlyout = useCallback(() => setEditFlyoutVisibility(false), [setEditFlyoutVisibility]);

  useEffect(() => {
    setAction(undefined);
    if (editFlyoutVisible && editedActionItem && editedActionItem.id) {
      loadActionById(editedActionItem.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editFlyoutVisible]);

  async function loadActionById(actionItemId: string) {
    setIsLoadingAction(true);
    try {
      const actionResponse = await getActionById({ id: actionItemId, http });
      setAction({ ...actionResponse, secrets: {} });
    } catch (e) {
      toastNotifications.addDanger({
        title: i18n.translate(
          'xpack.triggersActionsUI.sections.actionEdit.unableToLoadActionMessage',
          {
            defaultMessage: 'Unable to load action',
          }
        ),
      });
    } finally {
      setIsLoadingAction(false);
    }
  }

  if (!editFlyoutVisible && !action) {
    return null;
  }

  let actionTypeModel;
  if (editedActionItem) {
    actionTypeModel = actionTypeRegistry.get(editedActionItem.actionTypeId);
  }

  return (
    <EuiFlyout onClose={closeFlyout} aria-labelledby="flyoutActionAddTitle" size="m">
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup gutterSize="s" alignItems="center">
          {actionTypeModel ? (
            <EuiFlexItem grow={false}>
              <EuiIcon type={actionTypeModel.iconClass} size="m" />
            </EuiFlexItem>
          ) : null}
          <EuiFlexItem>
            <EuiTitle size="s">
              <h3 id="flyoutTitle">
                <FormattedMessage
                  defaultMessage={'Edit connector'}
                  id="xpack.triggersActionsUI.sections.actionAdd.flyoutTitle"
                />
              </h3>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>
      {action && editedActionItem ? (
        <ActionForm
          initialAction={action}
          actionTypeName={editedActionItem.actionType}
          setFlyoutVisibility={setEditFlyoutVisibility}
        />
      ) : (
        <SectionLoading>
          <FormattedMessage
            id="xpack.triggersActionsUI.sections.actionAdd.loadingWatchDescription"
            defaultMessage="Loading watch…"
          />
        </SectionLoading>
      )}
    </EuiFlyout>
  );
};
