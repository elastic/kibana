/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { PureComponent, Fragment } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import PropTypes from 'prop-types';
import { MinAgeInput } from '../min_age_input';

import { EuiDescribedFormGroup, EuiSwitch } from '@elastic/eui';
import { PHASE_DELETE, PHASE_ENABLED } from '../../../../constants';
import { ActiveBadge, PhaseErrorMessage } from '../../../components';

export class DeletePhase extends PureComponent {
  static propTypes = {
    setPhaseData: PropTypes.func.isRequired,
    isShowingErrors: PropTypes.bool.isRequired,
    errors: PropTypes.object.isRequired,
  };

  render() {
    const {
      setPhaseData,
      phaseData,
      errors,
      isShowingErrors,
      hotPhaseRolloverEnabled,
    } = this.props;

    return (
      <div id="deletePhaseContent" aria-live="polite" role="region">
        <EuiDescribedFormGroup
          title={
            <div>
              <span className="eui-displayInlineBlock eui-alignMiddle">
                <FormattedMessage
                  id="xpack.indexLifecycleMgmt.editPolicy.deletePhase.deletePhaseLabel"
                  defaultMessage="Delete phase"
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
                  id="xpack.indexLifecycleMgmt.editPolicy.deletePhase.deletePhaseDescriptionText"
                  defaultMessage="You no longer need your index.  You can define when it is safe to delete it."
                />
              </p>
              <EuiSwitch
                data-test-subj="enablePhaseSwitch-delete"
                label={
                  <FormattedMessage
                    id="xpack.indexLifecycleMgmt.editPolicy.deletePhase.activateWarmPhaseSwitchLabel"
                    defaultMessage="Activate delete phase"
                  />
                }
                id={`${PHASE_DELETE}-${PHASE_ENABLED}`}
                checked={phaseData[PHASE_ENABLED]}
                onChange={e => {
                  setPhaseData(PHASE_ENABLED, e.target.checked);
                }}
                aria-controls="deletePhaseContent"
              />
            </Fragment>
          }
          fullWidth
        >
          {phaseData[PHASE_ENABLED] ? (
            <MinAgeInput
              errors={errors}
              phaseData={phaseData}
              phase={PHASE_DELETE}
              isShowingErrors={isShowingErrors}
              setPhaseData={setPhaseData}
              rolloverEnabled={hotPhaseRolloverEnabled}
            />
          ) : (
            <div />
          )}
        </EuiDescribedFormGroup>
      </div>
    );
  }
}
