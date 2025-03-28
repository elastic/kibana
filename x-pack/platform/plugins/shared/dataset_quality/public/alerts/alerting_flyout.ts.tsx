/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleFormFlyout } from '@kbn/response-ops-rule-form/flyout';
import React, { useCallback, useEffect, useState } from 'react';
import { useKibanaContextForPlugin } from '../utils/use_kibana';

interface Props {
  addFlyoutVisible: boolean;
  setAddFlyoutVisibility: React.Dispatch<React.SetStateAction<boolean>>;
  dataStream?: string;
}

export function AlertingFlyout(props: Props) {
  const { addFlyoutVisible, setAddFlyoutVisibility, dataStream } = props;

  const {
    services: {
      triggersActionsUi: { ruleTypeRegistry, actionTypeRegistry },
      ...services
    },
  } = useKibanaContextForPlugin();

  const [initialValues, setInitialValues] = useState<{ name?: string }>({});

  useEffect(() => {
    if (dataStream) {
      setInitialValues({ name: dataStream });
    }
  }, [dataStream]);

  const onCloseAddFlyout = useCallback(
    () => setAddFlyoutVisibility(false),
    [setAddFlyoutVisibility]
  );

  return (
    <>
      {addFlyoutVisible && (
        <RuleFormFlyout
          plugins={{ ...services, ruleTypeRegistry, actionTypeRegistry }}
          consumer={'datasetQuality'}
          onCancel={onCloseAddFlyout}
          onSubmit={onCloseAddFlyout}
          ruleTypeId="datasetQuality"
          initialValues={{
            params: initialValues,
          }}
          shouldUseRuleProducer
        />
      )}
    </>
  );
}
