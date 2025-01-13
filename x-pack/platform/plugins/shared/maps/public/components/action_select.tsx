/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component } from 'react';
import { EuiFormRow, EuiSuperSelect, EuiIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ActionExecutionContext, Action } from '@kbn/ui-actions-plugin/public';
import { isUrlDrilldown } from '../trigger_actions/trigger_utils';

interface Props {
  value?: string;
  onChange: (value: string) => void;
  getFilterActions?: () => Promise<Action[]>;
  getActionContext?: () => ActionExecutionContext;
}

interface State {
  actions: Action[];
}

export class ActionSelect extends Component<Props, State> {
  private _isMounted = false;
  state: State = {
    actions: [],
  };

  componentDidMount() {
    this._isMounted = true;
    this._loadActions();
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  async _loadActions() {
    if (!this.props.getFilterActions || !this.props.getActionContext) {
      return;
    }
    const actions = await this.props.getFilterActions();
    if (this._isMounted) {
      this.setState({ actions: actions.filter((action) => !isUrlDrilldown(action)) });
    }
  }

  render() {
    if (this.state.actions.length === 0 || !this.props.getActionContext) {
      return null;
    }

    if (this.state.actions.length === 1 && this.props.value === this.state.actions[0].id) {
      return null;
    }

    const actionContext = this.props.getActionContext();
    const options = this.state.actions.map((action) => {
      const iconType = action.getIconType(actionContext);
      return {
        value: action.id,
        inputDisplay: (
          <div>
            {iconType ? <EuiIcon className="mapActionSelectIcon" type={iconType} /> : null}
            {action.getDisplayName(actionContext)}
          </div>
        ),
      };
    });

    return (
      <EuiFormRow
        label={i18n.translate('xpack.maps.actionSelect.label', {
          defaultMessage: 'Action',
        })}
        display="rowCompressed"
      >
        <EuiSuperSelect
          compressed
          options={options}
          valueOfSelected={this.props.value ? this.props.value : ''}
          onChange={this.props.onChange}
        />
      </EuiFormRow>
    );
  }
}
