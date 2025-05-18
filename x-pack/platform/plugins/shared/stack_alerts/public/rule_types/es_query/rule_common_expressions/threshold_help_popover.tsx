/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component } from 'react';
import { EuiButtonIcon, EuiPopover, EuiPopoverTitle, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
interface State {
  isPopoverOpen: boolean;
}

const PopoverStyles = css`
  max-width: 400px;
`;

export class QueryThresholdHelpPopover extends Component<{}, State> {
  state: State = {
    isPopoverOpen: false,
  };

  PopoverStyles = css`
    max-width: 400px;
  `;

  _togglePopover = () => {
    this.setState((prevState) => ({
      isPopoverOpen: !prevState.isPopoverOpen,
    }));
  };

  _closePopover = () => {
    this.setState({
      isPopoverOpen: false,
    });
  };

  _renderContent() {
    return (
      <div css={PopoverStyles}>
        <EuiText grow={false} size="s">
          <p>
            <FormattedMessage
              id="xpack.stackAlerts.esQuery.ui.thresholdHelp.threshold"
              defaultMessage="Each time the rule runs, it checks whether the number of documents that match your query meets this threshold. If there is a grouped over clause, the rule checks the condition for the specified number of top groups."
            />
          </p>
          <p>
            <FormattedMessage
              id="xpack.stackAlerts.esQuery.ui.thresholdHelp.timeWindow"
              defaultMessage="The time window indicates how far back in time to search.
              To avoid gaps in detection, set this value greater than or equal to the value you chose for the {checkField} field."
              values={{
                checkField: <b>Check every</b>,
              }}
            />
          </p>
          <p>
            <FormattedMessage
              id="xpack.stackAlerts.esQuery.ui.thresholdHelp.duplicateMatches"
              defaultMessage="If {excludePrevious} is turned on, a document that matches the query in multiple runs will be used in only the first threshold calculation."
              values={{
                excludePrevious: <b>Exclude matches from previous runs</b>,
              }}
            />
          </p>
        </EuiText>
      </div>
    );
  }

  render() {
    return (
      <EuiPopover
        id="thresholdHelpPopover"
        data-test-subj="thresholdHelpPopover"
        anchorPosition="upLeft"
        button={
          <EuiButtonIcon
            onClick={this._togglePopover}
            iconType="documentation"
            aria-label={i18n.translate('xpack.stackAlerts.esQuery.ui.thresholdHelp.ariaLabel', {
              defaultMessage: 'Help',
            })}
          />
        }
        isOpen={this.state.isPopoverOpen}
        closePopover={this._closePopover}
        repositionOnScroll
        ownFocus
      >
        <EuiPopoverTitle>
          <FormattedMessage
            id="xpack.stackAlerts.esQuery.ui.thresholdHelp.title"
            defaultMessage="Set the group, threshold and time window"
          />
        </EuiPopoverTitle>
        {this._renderContent()}
      </EuiPopover>
    );
  }
}
