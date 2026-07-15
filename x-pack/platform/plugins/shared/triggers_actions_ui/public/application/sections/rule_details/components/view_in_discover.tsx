/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
import { EuiButtonEmpty } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { fromNullable, fold } from 'fp-ts/Option';
import { pipe } from 'fp-ts/pipeable';

import type { Rule } from '../../../../types';
import { useKibana } from '../../../../common/lib/kibana';

export interface ViewInDiscoverProps {
  rule: Rule;
}

const NO_NAVIGATION = false;

type RuleNavigationLoadingState = string | false | null;

export const ViewInDiscover: React.FunctionComponent<ViewInDiscoverProps> = ({ rule }) => {
  const {
    http: { basePath },
    alerting: maybeAlerting,
  } = useKibana().services;

  const [ruleNavigation, setRuleNavigation] = useState<RuleNavigationLoadingState>(null);
  useEffect(() => {
    pipe(
      fromNullable(maybeAlerting),
      fold(
        /**
         * If the alerting plugin is disabled,
         * navigation isn't supported
         */
        () => setRuleNavigation(NO_NAVIGATION),
        (alerting) => {
          return alerting
            .getNavigation(rule.id)
            .then((nav) => (nav ? setRuleNavigation(nav) : setRuleNavigation(NO_NAVIGATION)))
            .catch(() => {
              setRuleNavigation(NO_NAVIGATION);
            });
        }
      )
    );
  }, [rule.id, maybeAlerting]);

  if (!ruleNavigation) return null;

  return (
    <EuiButtonEmpty
      data-test-subj="ruleDetails-viewInDiscover"
      isLoading={ruleNavigation === null}
      href={basePath.prepend(ruleNavigation)}
      iconType="discoverApp"
    >
      {i18n.translate(
        'xpack.triggersActionsUI.sections.ruleDetails.viewRuleInDiscoverButtonLabel',
        { defaultMessage: 'View in Discover' }
      )}
    </EuiButtonEmpty>
  );
};
