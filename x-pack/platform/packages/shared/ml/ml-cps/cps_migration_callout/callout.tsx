/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback, useEffect, useState } from 'react';

import { EuiButton, EuiCallOut, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { HttpStart } from '@kbn/core-http-browser';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { MIGRATE_AD_JOBS_TO_CPS_TRIGGER } from '@kbn/ui-actions-plugin/common/trigger_ids';

/** Matches the migrate flyout dry-run. */
const BULK_UPDATE_PROJECT_ROUTING_PATH = '/internal/ml/jobs/bulk_update_project_routing' as const;

export interface CpsMigrationCalloutProps {
  http: HttpStart;
  uiActions: UiActionsStart;
  options?: {
    filterJobGroups?: string[];
  };
  /** Called when the migrate flyout is closed (optional context on the trigger). */
  onMigrateFlyoutClose?: () => void;
}

/**
 * @internal
 * Matches the ML plugin response for {@code bulk_update_project_routing}.
 */
export interface BulkUpdateProjectRoutingResult {
  simulate: boolean;
  results: Record<
    string,
    { success: boolean; datafeedId: string; simulated?: boolean; error?: unknown }
  >;
}

export const CpsMigrationCallout: FC<CpsMigrationCalloutProps> = ({
  http,
  uiActions,
  options,
  onMigrateFlyoutClose,
}) => {
  const [jobIds, setJobIds] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;

    void http
      .post<BulkUpdateProjectRoutingResult>(BULK_UPDATE_PROJECT_ROUTING_PATH, {
        body: JSON.stringify({
          projectRouting: '_alias:_origin',
          simulate: true,
          auto: true,
          jobGroups: options?.filterJobGroups,
        }),
        version: '1',
        asSystemRequest: true,
      })
      .then((response) => {
        if (cancelled) {
          return;
        }
        setJobIds(Object.keys(response.results));
      })
      .catch(() => {
        if (cancelled) {
          return;
        }
      });

    return () => {
      cancelled = true;
    };
  }, [http, options]);

  const onMigrate = useCallback(() => {
    void uiActions.executeTriggerActions(MIGRATE_AD_JOBS_TO_CPS_TRIGGER, {
      initialJobIds: jobIds,
      allowScopeSelection: false,
      onClose: onMigrateFlyoutClose,
    });
  }, [uiActions, onMigrateFlyoutClose, jobIds]);

  if (jobIds.length === 0) {
    return null;
  }

  return (
    <>
      <EuiCallOut
        title={i18n.translate('xpack.ml.cpsMigrationCallout.title', {
          defaultMessage: 'Migrate legacy jobs to use cross-project search',
        })}
        color="primary"
        data-test-subj="mlCpsMigrationCallout"
      >
        <EuiText size="s" data-test-subj="mlCpsMigrationCalloutJobCount">
          <FormattedMessage
            id="xpack.ml.cpsMigrationCallout.jobCount"
            defaultMessage="Some jobs are legacy. Migrate them to cross-project search."
          />
        </EuiText>
        <EuiSpacer size="m" />
        <EuiButton
          data-test-subj="mlCpsMigrationCalloutMigrate"
          onClick={onMigrate}
          color="primary"
          size="s"
        >
          {i18n.translate('xpack.ml.cpsMigrationCallout.migrateButton', {
            defaultMessage: 'Migrate {count, plural, one {# job} other {# jobs}}',
            values: { count: jobIds.length },
          })}
        </EuiButton>
      </EuiCallOut>

      <EuiSpacer size="m" />
    </>
  );
};
