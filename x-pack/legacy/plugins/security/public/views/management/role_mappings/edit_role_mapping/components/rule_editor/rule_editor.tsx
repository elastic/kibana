/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import { EuiButtonEmpty, EuiSpacer, EuiConfirmModal, EuiOverlayMask } from '@elastic/eui';
import { RoleMapping } from '../../../../../../../common/model';
import { BaseRule } from '../../../../../../../common/model/role_mappings/base_rule';
import { generateRulesFromRaw } from '../../../../../../../common/model/role_mappings/rule_builder';
import { VisualRuleEditor } from './visual_rule_editor';
import { AdvancedRuleEditor } from './advanced_rule_editor';

interface Props {
  roleMapping: RoleMapping;
  onChange: (roleMapping: RoleMapping) => void;
}

interface State {
  rules: BaseRule | null;
  isRuleValid: boolean;
  showConfirmModeChange: boolean;
  mode: 'visual' | 'advanced';
}

export class RuleEditor extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      rules: generateRulesFromRaw(props.roleMapping.rules),
      isRuleValid: true,
      showConfirmModeChange: false,
      mode: 'advanced',
    };
  }

  componentWillReceiveProps(nextProps: Props) {
    if (!this.state.rules) {
      this.setState({
        rules: generateRulesFromRaw(nextProps.roleMapping.rules),
      });
    }
  }

  public render() {
    return (
      <div>
        {this.getModeToggle()}
        <EuiSpacer />
        {this.getEditor()}
        {this.getConfirmModeChangePrompt()}
      </div>
    );
  }

  private getModeToggle() {
    switch (this.state.mode) {
      case 'visual':
        return (
          <EuiButtonEmpty
            size="xs"
            onClick={() => {
              this.trySwitchEditorMode('advanced');
            }}
            iconType="inputOutput"
            iconSide="right"
            style={{ marginLeft: '0px' }}
          >
            Switch to advanced editor
          </EuiButtonEmpty>
        );
      case 'advanced':
        return (
          <EuiButtonEmpty
            size="xs"
            onClick={() => {
              this.trySwitchEditorMode('visual');
            }}
            iconType="inputOutput"
            iconSide="right"
            style={{ marginLeft: '0px' }}
          >
            Switch to visual editor
          </EuiButtonEmpty>
        );
      default:
        throw new Error(`Unexpected rule editor mode: ${this.state.mode}`);
    }
  }

  private getEditor() {
    switch (this.state.mode) {
      case 'visual':
        return <VisualRuleEditor rules={this.state.rules} onChange={this.onRuleChange} />;
      case 'advanced':
        return (
          <AdvancedRuleEditor
            rules={this.state.rules}
            onChange={this.onRuleChange}
            onValidityChange={this.onValidityChange}
          />
        );
      default:
        throw new Error(`Unexpected rule editor mode: ${this.state.mode}`);
    }
  }

  private getConfirmModeChangePrompt = () => {
    if (!this.state.showConfirmModeChange) {
      return null;
    }
    return (
      <EuiOverlayMask>
        <EuiConfirmModal
          title={'Switch with invalid rules?'}
          onCancel={() => this.setState({ showConfirmModeChange: false })}
          onConfirm={() => this.setState({ mode: 'visual', showConfirmModeChange: false })}
          cancelButtonText={'Cancel'}
          confirmButtonText={'Switch anyway'}
        >
          <p>
            The rules defined are not valid, and cannot be translated to the visual editor. You may
            lost some or all of your changes during the conversion. Do you wish to continue?
          </p>
        </EuiConfirmModal>
      </EuiOverlayMask>
    );
  };

  private onRuleChange = (updatedRule: BaseRule | null) => {
    this.props.onChange({
      ...this.props.roleMapping,
      rules: updatedRule ? updatedRule.toRaw() : {},
    });
    this.setState({
      rules: updatedRule,
    });
  };

  private onValidityChange = (isRuleValid: boolean) => {
    this.setState({ isRuleValid });
  };

  private trySwitchEditorMode = (newMode: State['mode']) => {
    switch (newMode) {
      case 'visual': {
        if (this.state.isRuleValid) {
          this.setState({ mode: newMode, isRuleValid: true });
        } else {
          this.setState({ showConfirmModeChange: true });
        }
        break;
      }
      case 'advanced':
        this.setState({ mode: newMode, isRuleValid: true });
        break;
      default:
        throw new Error(`Unexpected rule editor mode: ${this.state.mode}`);
    }
  };
}
