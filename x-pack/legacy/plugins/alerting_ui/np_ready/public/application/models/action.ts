/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { get } from 'lodash';
import { i18n } from '@kbn/i18n';

export class ActionModel {
  id: string;
  actionTypeId: string;
  description: string;
  config: Record<string, any>;
  secrets: Record<string, any>;

  constructor(props = {}) {
    this.id = get(props, 'id');
    this.actionTypeId = get(props, 'actionTypeId');
    this.description = get(props, 'description');
    this.config = get(props, 'config', {});
    this.secrets = get(props, 'secrets', {});
  }

  validate() {
    const validationResult = { errors: {} };
    const errors = {
      description: new Array<string>(),
    };
    validationResult.errors = errors;
    if (!this.description) {
      errors.description.push(
        i18n.translate('xpack.watcher.sections.watchEdit.threshold.error.requiredNameText', {
          defaultMessage: 'Description is required.',
        })
      );
    }
    return validationResult;
  }
}
