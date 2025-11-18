/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleFormFlyout } from '@kbn/response-ops-rule-form/flyout';
import React, { useCallback, useEffect, useState } from 'react';
import { DEGRADED_DOCS_RULE_TYPE_ID } from '@kbn/rule-data-utils';
import { useKibanaContextForPlugin } from '../utils/use_kibana';

interface Props {
  closeFlyout: () => void;
  dataStream?: string;
}

export function AlertFlyout(props: Props) {
  const { closeFlyout, dataStream } = props;

  const {
    services: {
      triggersActionsUi: { actionTypeRegistry, ruleTypeRegistry },
      ...services
    },
  } = useKibanaContextForPlugin();

  const [initialValues, setInitialValues] = useState<{ searchConfiguration?: { index: string } }>(
    {}
  );

  useEffect(() => {
    if (dataStream) {
      setInitialValues({ searchConfiguration: { index: dataStream } });
    }
  }, [dataStream]);

  const onCloseAddFlyout = useCallback(() => closeFlyout(), [closeFlyout]);

  return (
    <RuleFormFlyout
      plugins={{
        ...services,
        ruleTypeRegistry,
        actionTypeRegistry,
      }}
      onCancel={onCloseAddFlyout}
      onSubmit={onCloseAddFlyout}
      ruleTypeId={DEGRADED_DOCS_RULE_TYPE_ID}
      initialValues={{
        params: initialValues,
      }}
    />
  );
}
