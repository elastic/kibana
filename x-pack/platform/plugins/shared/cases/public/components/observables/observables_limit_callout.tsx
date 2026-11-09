/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import { KbnInfoCallout, KbnWarningCallout } from '@kbn/ui-callout';
import { MAX_STORED_OBSERVABLES_PER_CASE } from '../../../common/constants';
import * as i18n from './translations';

/** Share of the limit from which the case view warns that observables may not be added. */
const NEAR_LIMIT_RATIO = 0.9;

export const isAtObservablesLimit = (totalObservables: number): boolean =>
  totalObservables >= MAX_STORED_OBSERVABLES_PER_CASE;

export interface ObservablesLimitCalloutProps {
  totalObservables: number;
}

/**
 * Tells the user when a case is close to, or at, the observables limit, because observables over
 * the limit (including auto-extracted ones) are not added.
 */
export const ObservablesLimitCallout = ({ totalObservables }: ObservablesLimitCalloutProps) => {
  if (isAtObservablesLimit(totalObservables)) {
    return (
      <>
        <KbnWarningCallout
          announceOnMount
          size="s"
          title={i18n.OBSERVABLES_LIMIT_REACHED_TITLE}
          text={i18n.OBSERVABLES_LIMIT_REACHED_DESCRIPTION(MAX_STORED_OBSERVABLES_PER_CASE)}
          data-test-subj="cases-observables-limit-reached"
        />
        <EuiSpacer size="s" />
      </>
    );
  }

  if (totalObservables >= MAX_STORED_OBSERVABLES_PER_CASE * NEAR_LIMIT_RATIO) {
    return (
      <>
        <KbnInfoCallout
          announceOnMount
          size="s"
          title={i18n.OBSERVABLES_LIMIT_NEAR_TITLE(
            totalObservables,
            MAX_STORED_OBSERVABLES_PER_CASE
          )}
          text={i18n.OBSERVABLES_LIMIT_NEAR_DESCRIPTION}
          data-test-subj="cases-observables-limit-near"
        />
        <EuiSpacer size="s" />
      </>
    );
  }

  return null;
};

ObservablesLimitCallout.displayName = 'ObservablesLimitCallout';
