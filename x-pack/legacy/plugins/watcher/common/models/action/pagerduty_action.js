/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { BaseAction } from './base_action';
import { ACTION_TYPES, ERROR_CODES } from '../../../common/constants';
import { i18n } from '@kbn/i18n';

export class PagerDutyAction extends BaseAction {
  constructor(props, errors) {
    props.type = ACTION_TYPES.PAGERDUTY;
    super(props, errors);

    this.description = props.description;
  }

  // To Kibana
  get downstreamJson() {
    const result = super.downstreamJson;
    Object.assign(result, {
      description: this.description,
    });

    return result;
  }

  // From Kibana
  static fromDownstreamJson(json) {
    const props = super.getPropsFromDownstreamJson(json);
    const { errors } = this.validateJson(json);

    Object.assign(props, {
      description: json.description,
    });

    const action = new PagerDutyAction(props, errors);
    return { action, errors };
  }

  // To Elasticsearch
  get upstreamJson() {
    const result = super.upstreamJson;

    result[this.id] = {
      pagerduty: {
        description: this.description,
      },
    };

    return result;
  }

  // From Elasticsearch
  static fromUpstreamJson(json) {
    const props = super.getPropsFromUpstreamJson(json);
    const { errors } = this.validateJson(json.actionJson);

    Object.assign(props, {
      description: json.actionJson.pagerduty.description,
    });

    const action = new PagerDutyAction(props, errors);
    return { action, errors };
  }

  static validateJson(json) {
    const errors = [];

    if (!json.pagerduty) {
      errors.push({
        code: ERROR_CODES.ERR_PROP_MISSING,
        message: i18n.translate(
          'xpack.watcher.models.pagerDutyAction.actionJsonPagerDutyPropertyMissingBadRequestMessage',
          {
            defaultMessage: 'JSON argument must contain an {actionJsonPagerDuty} property',
            values: {
              actionJsonPagerDuty: 'actionJson.pagerduty',
            },
          }
        ),
      });
    }

    if (json.pagerduty && !json.pagerduty.description) {
      errors.push({
        code: ERROR_CODES.ERR_PROP_MISSING,
        message: i18n.translate(
          'xpack.watcher.models.pagerDutyAction.actionJsonPagerDutyDescriptionPropertyMissingBadRequestMessage',
          {
            defaultMessage: 'JSON argument must contain an {actionJsonPagerDutyText} property',
            values: {
              actionJsonPagerDutyText: 'actionJson.pagerduty.description',
            },
          }
        ),
      });
    }

    return { errors: errors.length ? errors : null };
  }
}
