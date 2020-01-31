/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * React component for rendering the form fields for editing the actions section of a rule.
 */

import PropTypes from 'prop-types';
import React from 'react';

import {
  EuiCheckbox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';

import { ACTION } from '../../../common/constants/detector_rule';
import { FormattedMessage } from '@kbn/i18n/react';

export function ActionsSection({ actions, onSkipResultChange, onSkipModelUpdateChange }) {
  return (
    <React.Fragment>
      <EuiText>
        <p>
          <FormattedMessage
            id="xpack.ml.ruleEditor.actionsSection.chooseActionsDescription"
            defaultMessage="Choose the action(s) to take when the rule matches an anomaly."
          />
        </p>
      </EuiText>
      <EuiSpacer size="s" />
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiCheckbox
            id="skip_result_cb"
            label={
              <FormattedMessage
                id="xpack.ml.ruleEditor.actionsSection.skipResultLabel"
                defaultMessage="Skip result (recommended)"
              />
            }
            checked={actions.indexOf(ACTION.SKIP_RESULT) > -1}
            onChange={onSkipResultChange}
          />
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiIconTip
            content={
              <FormattedMessage
                id="xpack.ml.ruleEditor.actionsSection.resultWillNotBeCreatedTooltip"
                defaultMessage="The result will not be created."
              />
            }
            size="s"
            position="right"
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="s" />

      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiCheckbox
            id="skip_model_update_cb"
            label={
              <FormattedMessage
                id="xpack.ml.ruleEditor.actionsSection.skipModelUpdateLabel"
                defaultMessage="Skip model update"
              />
            }
            checked={actions.indexOf(ACTION.SKIP_MODEL_UPDATE) > -1}
            onChange={onSkipModelUpdateChange}
          />
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiIconTip
            content={
              <FormattedMessage
                id="xpack.ml.ruleEditor.actionsSection.valueWillNotBeUsedToUpdateModelTooltip"
                defaultMessage="The value for that series will not be used to update the model."
              />
            }
            size="s"
            position="right"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </React.Fragment>
  );
}
ActionsSection.propTypes = {
  actions: PropTypes.array.isRequired,
  onSkipResultChange: PropTypes.func.isRequired,
  onSkipModelUpdateChange: PropTypes.func.isRequired,
};
