/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
import { EuiSwitch, EuiLoadingSpinner } from '@elastic/eui';

import { Rule, RuleTableItem } from '../../../../types';

export interface ComponentOpts {
  item: RuleTableItem;
  onRuleChanged: () => void;
  enableRule: (rule: Rule) => Promise<void>;
  disableRule: (rule: Rule) => Promise<void>;
}

export const RuleEnabledSwitch: React.FunctionComponent<ComponentOpts> = ({
  item,
  onRuleChanged,
  disableRule,
  enableRule,
}: ComponentOpts) => {
  const [isEnabled, setIsEnabled] = useState<boolean>(!item.enabled);
  useEffect(() => {
    setIsEnabled(item.enabled);
  }, [item.enabled]);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  return isUpdating ? (
    <EuiLoadingSpinner data-test-subj="enableSpinner" size="m" />
  ) : (
    <EuiSwitch
      name="enable"
      disabled={!item.isEditable || !item.enabledInLicense}
      compressed
      checked={isEnabled}
      data-test-subj="enableSwitch"
      onChange={async () => {
        setIsUpdating(true);
        const enabled = item.enabled;
        if (enabled) {
          await disableRule({ ...item, enabled });
        } else {
          await enableRule({ ...item, enabled });
        }
        setIsEnabled(!isEnabled);
        setIsUpdating(false);
        onRuleChanged();
      }}
      label=""
    />
  );
};
