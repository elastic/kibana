/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { PureComponent, Fragment } from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiFieldNumber,
  EuiDescribedFormGroup,
  EuiSwitch,
  EuiTextColor,
} from '@elastic/eui';

import {
  PHASE_COLD,
  PHASE_ENABLED,
  PHASE_REPLICA_COUNT,
  PHASE_FREEZE_ENABLED,
} from '../../../../constants';
import { LearnMoreLink, ActiveBadge, PhaseErrorMessage, OptionalLabel } from '../../../components';
import { ErrableFormRow } from '../../form_errors';
import { MinAgeInput } from '../min_age_input';
import { NodeAllocation } from '../node_allocation';
import { SetPriorityInput } from '../set_priority_input';

export class ColdPhase extends PureComponent {
  static propTypes = {
    setPhaseData: PropTypes.func.isRequired,
    showNodeDetailsFlyout: PropTypes.func.isRequired,

    isShowingErrors: PropTypes.bool.isRequired,
    errors: PropTypes.object.isRequired,
  };
  render() {
    const {
      setPhaseData,
      showNodeDetailsFlyout,
      phaseData,
      errors,
      isShowingErrors,
      hotPhaseRolloverEnabled,
    } = this.props;

    const freezeLabel = i18n.translate('xpack.indexLifecycleMgmt.coldPhase.freezeIndexLabel', {
      defaultMessage: 'Freeze index',
    });

    return (
      <div id="coldPhaseContent" aria-live="polite" role="region">
        <EuiDescribedFormGroup
          title={
            <div>
              <span className="eui-displayInlineBlock eui-alignMiddle">
                <FormattedMessage
                  id="xpack.indexLifecycleMgmt.editPolicy.coldPhase.coldPhaseLabel"
                  defaultMessage="Cold phase"
                />
              </span>{' '}
              {phaseData[PHASE_ENABLED] && !isShowingErrors ? <ActiveBadge /> : null}
              <PhaseErrorMessage isShowingErrors={isShowingErrors} />
            </div>
          }
          titleSize="s"
          description={
            <Fragment>
              <p>
                <FormattedMessage
                  id="xpack.indexLifecycleMgmt.editPolicy.coldPhase.coldPhaseDescriptionText"
                  defaultMessage="You are querying your index less frequently, so you can allocate shards
                  on significantly less performant hardware.
                  Because your queries are slower, you can reduce the number of replicas."
                />
              </p>
              <EuiSwitch
                data-test-subj="enablePhaseSwitch-cold"
                label={
                  <FormattedMessage
                    id="xpack.indexLifecycleMgmt.editPolicy.coldPhase.activateWarmPhaseSwitchLabel"
                    defaultMessage="Activate cold phase"
                  />
                }
                id={`${PHASE_COLD}-${PHASE_ENABLED}`}
                checked={phaseData[PHASE_ENABLED]}
                onChange={e => {
                  setPhaseData(PHASE_ENABLED, e.target.checked);
                }}
                aria-controls="coldPhaseContent"
              />
            </Fragment>
          }
          fullWidth
        >
          <Fragment>
            {phaseData[PHASE_ENABLED] ? (
              <Fragment>
                <MinAgeInput
                  errors={errors}
                  phaseData={phaseData}
                  phase={PHASE_COLD}
                  isShowingErrors={isShowingErrors}
                  setPhaseData={setPhaseData}
                  rolloverEnabled={hotPhaseRolloverEnabled}
                />
                <EuiSpacer />

                <NodeAllocation
                  phase={PHASE_COLD}
                  setPhaseData={setPhaseData}
                  showNodeDetailsFlyout={showNodeDetailsFlyout}
                  errors={errors}
                  phaseData={phaseData}
                  isShowingErrors={isShowingErrors}
                />

                <EuiFlexGroup>
                  <EuiFlexItem grow={false} style={{ maxWidth: 188 }}>
                    <ErrableFormRow
                      id={`${PHASE_COLD}-${PHASE_REPLICA_COUNT}`}
                      label={
                        <Fragment>
                          <FormattedMessage
                            id="xpack.indexLifecycleMgmt.coldPhase.numberOfReplicasLabel"
                            defaultMessage="Number of replicas"
                          />
                          <OptionalLabel />
                        </Fragment>
                      }
                      errorKey={PHASE_REPLICA_COUNT}
                      isShowingErrors={isShowingErrors}
                      errors={errors}
                      helpText={i18n.translate(
                        'xpack.indexLifecycleMgmt.coldPhase.replicaCountHelpText',
                        {
                          defaultMessage: 'By default, the number of replicas remains the same.',
                        }
                      )}
                    >
                      <EuiFieldNumber
                        id={`${PHASE_COLD}-${PHASE_REPLICA_COUNT}`}
                        value={phaseData[PHASE_REPLICA_COUNT]}
                        onChange={e => {
                          setPhaseData(PHASE_REPLICA_COUNT, e.target.value);
                        }}
                        min={0}
                      />
                    </ErrableFormRow>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </Fragment>
            ) : (
              <div />
            )}
          </Fragment>
        </EuiDescribedFormGroup>
        {phaseData[PHASE_ENABLED] ? (
          <Fragment>
            <EuiDescribedFormGroup
              title={
                <p>
                  <FormattedMessage
                    id="xpack.indexLifecycleMgmt.editPolicy.coldPhase.freezeText"
                    defaultMessage="Freeze"
                  />
                </p>
              }
              description={
                <EuiTextColor color="subdued">
                  <FormattedMessage
                    id="xpack.indexLifecycleMgmt.editPolicy.coldPhase.freezeIndexExplanationText"
                    defaultMessage="A frozen index has little overhead on the cluster and is blocked for write operations.
                    You can search a frozen index, but expect queries to be slower."
                  />{' '}
                  <LearnMoreLink docPath="frozen-indices.html" />
                </EuiTextColor>
              }
              fullWidth
              titleSize="xs"
            >
              <EuiSwitch
                data-test-subj="freezeSwitch"
                checked={phaseData[PHASE_FREEZE_ENABLED]}
                onChange={e => {
                  setPhaseData(PHASE_FREEZE_ENABLED, e.target.checked);
                }}
                label={freezeLabel}
                aria-label={freezeLabel}
              />
            </EuiDescribedFormGroup>
            <SetPriorityInput
              errors={errors}
              phaseData={phaseData}
              phase={PHASE_COLD}
              isShowingErrors={isShowingErrors}
              setPhaseData={setPhaseData}
            />
          </Fragment>
        ) : null}
      </div>
    );
  }
}
