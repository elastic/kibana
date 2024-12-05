/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiContextMenu,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiIcon,
  EuiPopover,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { METRIC_TYPE } from '@kbn/analytics';
import { PolicyFromES } from '../../../../../common/types';
import { trackUiMetric } from '../../../services/ui_metric';
import { hasLinkedIndices } from '../../../lib/policies';
import { getPoliciesListPath, getPolicyEditPath } from '../../../services/navigation';
import { UIM_EDIT_CLICK } from '../../../constants';
import { useIsReadOnly } from '../../../lib/use_is_read_only';
import { usePolicyListContext } from '../policy_list_context';
import { DeprecatedPolicyBadge, ManagedPolicyBadge } from '../components';
import { HotPhase } from './hot_phase';
import { WarmPhase } from './warm_phase';
import { Timeline } from './timeline';
import { ColdPhase } from './cold_phase';
import { DeletePhase } from './delete_phase';
import { FrozenPhase } from './frozen_phase';

export const ViewPolicyFlyout = ({ policy }: { policy: PolicyFromES }) => {
  const isReadOnly = useIsReadOnly();
  const { setListAction } = usePolicyListContext();
  const history = useHistory();
  const onClose = () => {
    history.push(getPoliciesListPath());
  };
  const onEdit = (policyName: string) => {
    trackUiMetric(METRIC_TYPE.CLICK, UIM_EDIT_CLICK);
    history.push(getPolicyEditPath(policyName));
  };
  const [showPopover, setShowPopover] = useState(false);
  const actionMenuItems = [
    /**
     * Edit policy
     */
    {
      name: i18n.translate('xpack.indexLifecycleMgmt.policyFlyout.editActionLabel', {
        defaultMessage: 'Edit',
      }),
      icon: <EuiIcon type="pencil" />,
      onClick: () => onEdit(policy.name),
    },
    /**
     * Add policy to index template
     */
    {
      name: i18n.translate('xpack.indexLifecycleMgmt.policyFlyout.addToIndexTemplate', {
        defaultMessage: 'Add to index template',
      }),
      icon: <EuiIcon type="plusInCircle" />,
      onClick: () => setListAction({ selectedPolicy: policy, actionType: 'addIndexTemplate' }),
    },
  ];
  /**
   * Delete policy
   */
  if (!hasLinkedIndices(policy)) {
    actionMenuItems.push({
      name: i18n.translate('xpack.indexLifecycleMgmt.policyFlyout.deleteActionLabel', {
        defaultMessage: 'Delete',
      }),
      icon: <EuiIcon type="trash" />,
      onClick: () => {
        setShowPopover(false);
        setListAction({ selectedPolicy: policy, actionType: 'deletePolicy' });
      },
    });
  }

  const managePolicyButton = (
    <EuiButton
      aria-label={i18n.translate(
        'xpack.indexLifecycleMgmt.policyFlyout.managePolicyActionsAriaLabel',
        {
          defaultMessage: 'Manage policy',
        }
      )}
      onClick={() => setShowPopover((previousBool) => !previousBool)}
      iconType="arrowUp"
      iconSide="right"
      fill
      data-test-subj="managePolicyButton"
    >
      {i18n.translate('xpack.indexLifecycleMgmt.policyFlyout.managePolicyButtonLabel', {
        defaultMessage: 'Manage',
      })}
    </EuiButton>
  );

  return (
    <EuiFlyout
      onClose={onClose}
      closeButtonProps={{
        'data-test-subj': 'policyFlyoutCloseButton',
      }}
    >
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup alignItems="center" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiTitle data-test-subj="policyFlyoutTitle">
              <h1>{policy.name}</h1>
            </EuiTitle>
          </EuiFlexItem>
          {policy.policy.deprecated ? (
            <EuiFlexItem grow={false}>
              {' '}
              <DeprecatedPolicyBadge />
            </EuiFlexItem>
          ) : null}
          {policy.policy?._meta?.managed ? (
            <EuiFlexItem grow={false}>
              {' '}
              <ManagedPolicyBadge />
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        {/* Timeline */}
        <Timeline policy={policy} />

        <EuiSpacer size="xxl" />
        {/* Hot phase */}
        {policy.policy.phases.hot && <HotPhase phases={policy.policy.phases} />}

        {/* Warm phase */}
        {policy.policy.phases.warm && <WarmPhase phases={policy.policy.phases} />}

        {/* Cold phase */}
        {policy.policy.phases.cold && <ColdPhase phases={policy.policy.phases} />}

        {/* Frozen phase */}
        {policy.policy.phases.frozen && <FrozenPhase phases={policy.policy.phases} />}

        {/* Delete phase */}
        {policy.policy.phases.delete && <DeletePhase phases={policy.policy.phases} />}
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty iconType="cross" onClick={onClose} flush="left">
              {i18n.translate('xpack.indexLifecycleMgmt.policyFlyout.closeButtonLabel', {
                defaultMessage: 'Close',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          {!isReadOnly && (
            <EuiFlexGroup gutterSize="none" alignItems="center" justifyContent="flexEnd">
              <EuiFlexItem grow={false}>
                <EuiPopover
                  isOpen={showPopover}
                  closePopover={() => setShowPopover(false)}
                  button={managePolicyButton}
                  panelPaddingSize="none"
                  repositionOnScroll
                >
                  <EuiContextMenu
                    initialPanelId={0}
                    panels={[
                      {
                        id: 0,
                        title: i18n.translate(
                          'xpack.indexLifecycleMgmt.policyFlyout.managePolicyTitle',
                          {
                            defaultMessage: 'Options',
                          }
                        ),
                        items: actionMenuItems,
                      },
                    ]}
                  />
                </EuiPopover>
              </EuiFlexItem>
            </EuiFlexGroup>
          )}
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
