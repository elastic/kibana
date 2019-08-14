/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chrome from 'ui/chrome';
import React, { Component } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButton,
  EuiPopover,
  EuiExpression,
  EuiFormHelpText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { QueryBar } from 'plugins/data';
import { Storage } from 'ui/storage';

const settings = chrome.getUiSettingsClient();
const localStorage = new Storage(window.localStorage);

export class WhereExpression extends Component {

  state = {
    isPopoverOpen: false,
  };

  _togglePopover = () => {
    this.setState((prevState) => ({
      isPopoverOpen: !prevState.isPopoverOpen,
    }));
  }

  _closePopover = () => {
    this.setState({
      isPopoverOpen: false,
    });
  }

  _onQueryChange = ({ query }) => {
    this.props.onChange(query);
    this._closePopover();
  }

  render() {
    const { whereQuery, indexPattern } = this.props;
    const expressionValue = whereQuery && whereQuery.query
      ? whereQuery.query
      : i18n.translate('xpack.maps.layerPanel.whereExpression.expressionValuePlaceholder', {
        defaultMessage: '-- add filter --'
      });

    return (
      <EuiPopover
        id="whereClausePopover"
        isOpen={this.state.isPopoverOpen}
        closePopover={this._closePopover}
        ownFocus
        withTitle
        anchorPosition="leftCenter"
        button={
          <EuiExpression
            onClick={this._togglePopover}
            description={i18n.translate('xpack.maps.layerPanel.whereExpression.expressionDescription', {
              defaultMessage: 'where'
            })}
            uppercase={false}
            value={expressionValue}
            data-test-subj="mapJoinWhereExpressionButton"
          />
        }
      >
        <div className="mapFilterEditor" data-test-subj="mapJoinWhereFilterEditor">
          <EuiFormHelpText className="mapJoinExpressionHelpText">
            <FormattedMessage
              id="xpack.maps.layerPanel.whereExpression.helpText"
              defaultMessage="Use a query to narrow right source."
            />
          </EuiFormHelpText>
          <QueryBar
            uiSettings={settings}
            query={whereQuery ? whereQuery : { language: settings.get('search:queryLanguage'), query: '' }}
            onSubmit={this._onQueryChange}
            appName="maps"
            showDatePicker={false}
            indexPatterns={[indexPattern]}
            store={localStorage}
            customSubmitButton={
              <EuiButton
                fill
                data-test-subj="mapWhereFilterEditorSubmitButton"
              >
                <FormattedMessage
                  id="xpack.maps.layerPanel.whereExpression.queryBarSubmitButtonLabel"
                  defaultMessage="Set filter"
                />
              </EuiButton>
            }
          />
        </div>
      </EuiPopover>
    );
  }
}
