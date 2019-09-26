/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


/*
 * Panel with a description of a rule and a list of actions that can be performed on the rule.
 */

import PropTypes from 'prop-types';
import React, {
  Component,
} from 'react';

import {
  EuiDescriptionList,
  EuiLink,
  EuiPanel,
} from '@elastic/eui';

import { cloneDeep } from 'lodash';

import { AddToFilterListLink } from './add_to_filter_list_link';
import { DeleteRuleModal } from './delete_rule_modal';
import { EditConditionLink } from './edit_condition_link';
import { buildRuleDescription } from '../utils';
import { ml } from '../../../services/ml_api_service';
import { FormattedMessage } from '@kbn/i18n/react';


export class RuleActionPanel extends Component {

  constructor(props) {
    super(props);

    const {
      job,
      anomaly,
      ruleIndex } = this.props;

    const detector = job.analysis_config.detectors[anomaly.detectorIndex];
    const rules = detector.custom_rules;
    if (rules !== undefined && ruleIndex < rules.length) {
      this.rule = rules[ruleIndex];
    }

    this.state = {
      showAddToFilterListLink: false,
    };
  }

  componentDidMount() {
    // If the rule has a scope section with a single partitioning field key,
    // load the filter list to check whether to add a link to add the
    // anomaly partitioning field value to the filter list.
    const scope = this.rule.scope;
    if (scope !== undefined && Object.keys(scope).length === 1) {
      const partitionFieldName = Object.keys(scope)[0];
      const partitionFieldValue = this.props.anomaly.source[partitionFieldName];

      if (scope[partitionFieldName] !== undefined &&
          partitionFieldValue !== undefined &&
          partitionFieldValue.length === 1 &&
          partitionFieldValue[0].length > 0) {

        const filterId = scope[partitionFieldName].filter_id;
        ml.filters.filters({ filterId })
          .then((filter) => {
            const filterItems = filter.items;
            if (filterItems.indexOf(partitionFieldValue[0]) === -1) {
              this.setState({ showAddToFilterListLink: true });
            }
          })
          .catch((resp) => {
            console.log(`Error loading filter ${filterId}:`, resp);
          });
      }

    }
  }

  getEditRuleLink = () => {
    const { ruleIndex, setEditRuleIndex } = this.props;
    return (
      <EuiLink
        onClick={() => setEditRuleIndex(ruleIndex)}
      >
        <FormattedMessage
          id="xpack.ml.ruleEditor.ruleActionPanel.editRuleLinkText"
          defaultMessage="Edit rule"
        />
      </EuiLink>
    );
  }

  getDeleteRuleLink = () => {
    const { ruleIndex, deleteRuleAtIndex } = this.props;
    return (
      <DeleteRuleModal
        ruleIndex={ruleIndex}
        deleteRuleAtIndex={deleteRuleAtIndex}
      />
    );
  }

  getQuickEditConditionLink = () => {
    // Returns the link to adjust the numeric value of a condition
    // if the rule has a single numeric condition.
    const conditions = this.rule.conditions;
    let link = null;
    if (this.rule.conditions !== undefined && conditions.length === 1) {
      link = (
        <EditConditionLink
          conditionIndex={0}
          conditionValue={conditions[0].value}
          appliesTo={conditions[0].applies_to}
          anomaly={this.props.anomaly}
          updateConditionValue={this.updateConditionValue}
        />
      );
    }

    return link;
  }

  getQuickAddToFilterListLink = () => {
    // Returns the link to add the partitioning field value of the anomaly to the filter
    // list used in the scope part of the rule.

    // Note componentDidMount performs the checks for the existence of scope and partitioning fields.
    const { anomaly, addItemToFilterList } = this.props;
    const scope = this.rule.scope;
    const partitionFieldName = Object.keys(scope)[0];
    const partitionFieldValue = anomaly.source[partitionFieldName];
    const filterId = scope[partitionFieldName].filter_id;

    // Partitioning field values stored under named field in anomaly record will be an array.
    return (
      <AddToFilterListLink
        fieldValue={partitionFieldValue[0]}
        filterId={filterId}
        addItemToFilterList={addItemToFilterList}
      />
    );
  }

  updateConditionValue = (conditionIndex, value) => {
    const {
      job,
      anomaly,
      ruleIndex,
      updateRuleAtIndex } = this.props;

    const detector = job.analysis_config.detectors[anomaly.detectorIndex];
    const editedRule = cloneDeep(detector.custom_rules[ruleIndex]);

    const conditions = editedRule.conditions;
    if (conditionIndex < conditions.length) {
      conditions[conditionIndex].value = value;
    }

    updateRuleAtIndex(ruleIndex, editedRule);
  }

  render() {
    if (this.rule === undefined) {
      return null;
    }

    // Add items for the standard Edit and Delete links.
    const descriptionListItems = [
      {
        title: (<FormattedMessage id="xpack.ml.ruleEditor.ruleActionPanel.ruleTitle" defaultMessage="rule" />),
        description: buildRuleDescription(this.rule, this.props.anomaly),
      },
      {
        title: '',
        description: this.getEditRuleLink(),
      },
      {
        title: '',
        description: this.getDeleteRuleLink()
      }
    ];

    // Insert links if applicable for quick edits to a numeric condition
    // or to the safe list used by the scope.
    const quickConditionLink = this.getQuickEditConditionLink();
    if (quickConditionLink !== null) {
      descriptionListItems.splice(1, 0, {
        title: '', description: quickConditionLink
      });
    }

    if (this.state.showAddToFilterListLink === true) {
      const quickAddToFilterListLink = this.getQuickAddToFilterListLink();
      descriptionListItems.splice(descriptionListItems.length - 2, 0, {
        title: '', description: quickAddToFilterListLink
      });
    }

    descriptionListItems[1].title = 'actions';

    return (
      <EuiPanel paddingSize="m" className="select-rule-action-panel">
        <EuiDescriptionList
          type="column"
          listItems={descriptionListItems}
        />
      </EuiPanel>
    );
  }
}
RuleActionPanel.propTypes = {
  job: PropTypes.object.isRequired,
  anomaly: PropTypes.object.isRequired,
  ruleIndex: PropTypes.number.isRequired,
  setEditRuleIndex: PropTypes.func.isRequired,
  updateRuleAtIndex: PropTypes.func.isRequired,
  deleteRuleAtIndex: PropTypes.func.isRequired,
  addItemToFilterList: PropTypes.func.isRequired,
};

