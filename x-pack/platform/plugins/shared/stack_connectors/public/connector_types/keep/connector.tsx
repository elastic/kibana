/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import { ConfigurationFormItems } from '@kbn/inference-endpoint-ui-common';

const ConnectorFields: React.FunctionComponent = ({ isEdit, actionTypeModel }) => {
  let fields = [];
  switch (actionTypeModel?.id) {
    case 'Airflow':
      fields = [
        {
          "key": "host",
          "label": "Host",
          "isValid": true,
          "validationErrors": [],
          "value": null,
          "default_value": null,
          "required": true,
          "sensitive": true,
          "updatable": true,
          "type": "str",
          "supported_task_types": ["text_embedding", "completion"]
        },
        {
          "key": "port",
          "label": "Port",
          "isValid": true,
          "validationErrors": [],
          "value": null,
          "default_value": null,
          "required": true,
          "sensitive": false,
          "updatable": false,
          "type": "str",
          "supported_task_types": ["text_embedding", "completion"]
        },
        {
          "key": "username",
          "label": "Username",
          "isValid": true,
          "validationErrors": [],
          "value": null,
          "default_value": null,
          "required": true,
          "sensitive": false,
          "updatable": false,
          "type": "str",
          "supported_task_types": ["text_embedding", "completion"]
        },
        {
          "key": "password",
          "label": "Password",
          "isValid": true,
          "validationErrors": [],
          "value": null,
          "default_value": null,
          "required": true,
          "sensitive": false,
          "updatable": false,
          "type": "str",
          "supported_task_types": ["text_embedding", "completion"]
        }
      ];
      break;
    case 'AmazonSQS Provider':
      fields = [
        {
          "key": "region_name",
          "label": "Region Name",
          "isValid": true,
          "validationErrors": [],
          "value": null,
          "default_value": null,
          "required": true,
          "sensitive": true,
          "updatable": true,
          "type": "str",
          "supported_task_types": ["text_embedding", "completion"]
        },
        {
          "key": "sqs_queue_url",
          "label": "SQS Queue URL",
          "isValid": true,
          "validationErrors": [],
          "value": null,
          "default_value": null,
          "required": true,
          "sensitive": false,
          "updatable": false,
          "type": "str",
          "supported_task_types": ["text_embedding", "completion"]
        },
        {
          "key": "access_key_id",
          "label": "Access Key Id",
          "isValid": true,
          "validationErrors": [],
          "value": null,
          "default_value": null,
          "required": true,
          "sensitive": false,
          "updatable": false,
          "type": "str",
          "supported_task_types": ["text_embedding", "completion"]
        },
        {
          "key": "secret_access_key",
          "label": "Secret access key",
          "isValid": true,
          "validationErrors": [],
          "value": null,
          "default_value": null,
          "required": true,
          "sensitive": false,
          "updatable": false,
          "type": "str",
          "supported_task_types": ["text_embedding", "completion"]
        }
      ];
      break;
  }
  return (
    <>
      <EuiSpacer size="m" />
      <ConfigurationFormItems
        isLoading={false}
        direction="column"
        items={fields}
        setConfigEntry={() => {}}
        isEdit={isEdit}
        isPreconfigured={false}
        isInternalProvider={false}
      />
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { ConnectorFields as default };
