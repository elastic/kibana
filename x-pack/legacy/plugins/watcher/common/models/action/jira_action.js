/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { BaseAction } from './base_action';
import { ACTION_TYPES, ERROR_CODES } from '../../../common/constants';
import { i18n } from '@kbn/i18n';
import { get } from 'lodash';

export class JiraAction extends BaseAction {
  constructor(props, errors) {
    props.type = ACTION_TYPES.JIRA;
    super(props, errors);

    this.projectKey = props.projectKey;
    this.issueType = props.issueType;
    this.summary = props.summary;
  }

  // To Kibana
  get downstreamJson() {
    const result = super.downstreamJson;
    Object.assign(result, {
      projectKey: this.projectKey,
      issueType: this.issueType,
      summary: this.summary,
    });

    return result;
  }

  // From Kibana
  static fromDownstreamJson(json) {
    const props = super.getPropsFromDownstreamJson(json);
    const { errors } = this.validateJson(json);

    Object.assign(props, {
      projectKey: json.projectKey,
      issueType: json.issueType,
      summary: json.summary,
    });

    const action = new JiraAction(props, errors);
    return { action, errors };
  }

  // To Elasticsearch
  get upstreamJson() {
    const result = super.upstreamJson;

    result[this.id] = {
      jira: {
        fields: {
          project: {
            key: this.projectKey,
          },
          issuetype: {
            name: this.issueType,
          },
          summary: this.summary,
        },
      },
    };

    return result;
  }

  // From Elasticsearch
  static fromUpstreamJson(json) {
    const props = super.getPropsFromUpstreamJson(json);
    const { errors } = this.validateJson(json.actionJson);

    Object.assign(props, {
      projectKey: get(json, 'actionJson.jira.fields.project.key'),
      issueType: get(json, 'actionJson.jira.fields.issuetype.name'),
      summary: get(json, 'actionJson.jira.fields.summary'),
    });

    const action = new JiraAction(props, errors);
    return { action, errors };
  }

  static validateJson(json) {
    const errors = [];

    if (!json.jira) {
      errors.push({
        code: ERROR_CODES.ERR_PROP_MISSING,
        message: i18n.translate(
          'xpack.watcher.models.jiraAction.actionJsonJiraPropertyMissingBadRequestMessage',
          {
            defaultMessage: 'JSON argument must contain an {actionJsonJira} property',
            values: {
              actionJsonJira: 'actionJson.jira',
            },
          }
        ),
      });
    }

    if (!get(json, 'jira.fields.project.key')) {
      errors.push({
        code: ERROR_CODES.ERR_PROP_MISSING,
        message: i18n.translate(
          'xpack.watcher.models.jiraAction.actionJsonJiraProjectKeyPropertyMissingBadRequestMessage',
          {
            defaultMessage: 'JSON argument must contain an {actionJsonJiraProjectKey} property',
            values: {
              actionJsonJiraProjectKey: 'actionJson.jira.fields.project.key',
            },
          }
        ),
      });
    }

    if (!get(json, 'jira.fields.issuetype.name')) {
      errors.push({
        code: ERROR_CODES.ERR_PROP_MISSING,
        message: i18n.translate(
          'xpack.watcher.models.jiraAction.actionJsonJiraIssueTypePropertyMissingBadRequestMessage',
          {
            defaultMessage: 'JSON argument must contain an {actionJsonJiraIssueType} property',
            values: {
              actionJsonJiraIssueType: 'actionJson.jira.fields.issuetype.name',
            },
          }
        ),
      });
    }

    if (!get(json, 'jira.fields.summary')) {
      errors.push({
        code: ERROR_CODES.ERR_PROP_MISSING,
        message: i18n.translate(
          'xpack.watcher.models.jiraAction.actionJsonJiraSummaryPropertyMissingBadRequestMessage',
          {
            defaultMessage: 'JSON argument must contain an {actionJsonJiraSummary} property',
            values: {
              actionJsonJiraSummary: 'actionJson.jira.fields.summary',
            },
          }
        ),
      });
    }

    return { errors: errors.length ? errors : null };
  }
}
