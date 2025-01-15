/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConnectorCreateParams } from '../../../../../application/connector/methods/create/types';
import { CreateConnectorRequestBodyV1 } from '../../../../../../common/routes/connector/apis/create';

export const transformCreateConnectorBody = ({
  connector_type_id: actionTypeId,
  name,
  config,
  secrets,
}: CreateConnectorRequestBodyV1): ConnectorCreateParams['action'] => ({
  actionTypeId,
  name,
  config,
  secrets,
});
