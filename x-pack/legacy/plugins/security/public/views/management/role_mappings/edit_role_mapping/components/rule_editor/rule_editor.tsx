/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import {
  EuiSpacer,
  EuiConfirmModal,
  EuiOverlayMask,
  EuiText,
  EuiCallOut,
  EuiIcon,
  EuiLink,
} from '@elastic/eui';
import { RoleMapping } from '../../../../../../../common/model';
import { VisualRuleEditor } from './visual_rule_editor';
import { AdvancedRuleEditor } from './advanced_rule_editor';
import {
  DEFAULT_VISUAL_EDITOR_RULE_DEPTH_CUTOFF,
  VISUAL_MAX_RULE_DEPTH,
} from '../../services/role_mapping_constants';
import { BaseRule, generateRulesFromRaw } from '../../../model';

interface Props {
  rawRules: RoleMapping['rules'];
  onChange: (rawRules: RoleMapping['rules']) => void;
  onValidityChange: (isValid: boolean) => void;
}

interface State {
  rules: BaseRule | null;
  maxDepth: number;
  isRuleValid: boolean;
  showConfirmModeChange: boolean;
  showVisualEditorDisabledAlert: boolean;
  mode: 'visual' | 'advanced';
}

export class RuleEditor extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      ...this.initializeFromRawRules(props.rawRules),
      isRuleValid: true,
      showConfirmModeChange: false,
      showVisualEditorDisabledAlert: false,
    };
  }

  // public componentWillReceiveProps(nextProps: Props) {
  //   if (!this.state.rules) {
  //     const nextState = this.initializeFromRawRules(nextProps.rawRules);
  //     if (nextState.rules) {
  //       this.setState({ ...nextState });
  //     }
  //   }
  // }

  public render() {
    return (
      <div>
        {this.getEditor()}
        <EuiSpacer />
        {this.getModeToggle()}
        {this.getConfirmModeChangePrompt()}
      </div>
    );
  }

  private initializeFromRawRules = (rawRules: Props['rawRules']) => {
    const { rules, maxDepth } = generateRulesFromRaw(rawRules);
    const mode: State['mode'] =
      maxDepth > DEFAULT_VISUAL_EDITOR_RULE_DEPTH_CUTOFF ? 'advanced' : 'visual';
    return {
      rules,
      mode,
      maxDepth,
    };
  };

  private getModeToggle() {
    if (this.state.mode === 'advanced' && this.state.maxDepth > VISUAL_MAX_RULE_DEPTH) {
      return (
        <EuiCallOut size="s" title="Visual editor unavailable">
          Rule definition is too complex for the visual editor
        </EuiCallOut>
      );
    }

    switch (this.state.mode) {
      case 'visual':
        return (
          <EuiLink
            data-test-subj="roleMappingsAdvancedRuleEditorButton"
            onClick={() => {
              this.trySwitchEditorMode('advanced');
            }}
          >
            Switch to advanced editor <EuiIcon type="inputOutput" size="s" />
          </EuiLink>
        );
      case 'advanced':
        return (
          <EuiLink
            data-test-subj="roleMappingsVisualRuleEditorButton"
            onClick={() => {
              this.trySwitchEditorMode('visual');
            }}
          >
            Switch to visual editor <EuiIcon type="inputOutput" size="s" />
          </EuiLink>
        );
      default:
        throw new Error(`Unexpected rule editor mode: ${this.state.mode}`);
    }
  }

  private getEditor() {
    switch (this.state.mode) {
      case 'visual':
        return (
          <VisualRuleEditor
            rules={this.state.rules}
            maxDepth={this.state.maxDepth}
            onChange={this.onRuleChange}
            onSwitchEditorMode={() => this.trySwitchEditorMode('advanced')}
          />
        );
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
          onConfirm={() => {
            this.setState({ mode: 'visual', showConfirmModeChange: false });
            this.onValidityChange(true);
          }}
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
    const raw = updatedRule ? updatedRule.toRaw() : {};
    this.props.onChange(raw);
    this.setState({
      ...generateRulesFromRaw(raw),
    });
  };

  private onValidityChange = (isRuleValid: boolean) => {
    this.setState({ isRuleValid });
    this.props.onValidityChange(isRuleValid);
  };

  private trySwitchEditorMode = (newMode: State['mode']) => {
    switch (newMode) {
      case 'visual': {
        if (this.state.isRuleValid) {
          this.setState({ mode: newMode });
          this.onValidityChange(true);
        } else {
          this.setState({ showConfirmModeChange: true });
        }
        break;
      }
      case 'advanced':
        this.setState({ mode: newMode });
        this.onValidityChange(true);
        break;
      default:
        throw new Error(`Unexpected rule editor mode: ${this.state.mode}`);
    }
  };
}
