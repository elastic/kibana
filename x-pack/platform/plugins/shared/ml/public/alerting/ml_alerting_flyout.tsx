/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { EuiButtonEmpty } from '@elastic/eui';
import { RuleFormFlyout } from '@kbn/response-ops-rule-form/flyout';
import type { Rule } from '@kbn/triggers-actions-ui-plugin/public';
import type { JobId } from '../../common/types/anomaly_detection_jobs';
import { useMlKibana } from '../application/contexts/kibana';
import { ML_ALERT_TYPES } from '../../common/constants/alerts';
import { PLUGIN_ID } from '../../common/constants/app';
import type {
  MlAnomalyDetectionAlertRule,
  MlAnomalyDetectionAlertParams,
} from '../../common/types/alerts';
import type { FocusTrapProps } from '../application/util/create_focus_trap_props';
import { createJobActionFocusTrapProps } from '../application/util/create_focus_trap_props';

interface MlAnomalyAlertFlyoutProps {
  initialAlert?: MlAnomalyDetectionAlertRule & Rule;
  jobIds?: JobId[];
  initialParams?: Partial<MlAnomalyDetectionAlertParams>;
  onSave?: () => void;
  onCloseFlyout: () => void;
  focusTrapProps?: FocusTrapProps;
}

/**
 * Invoke alerting flyout from the ML plugin context.
 * @param initialAlert
 * @param jobIds
 * @param onCloseFlyout
 * @param onSave
 * @constructor
 */
export const MlAnomalyAlertFlyout: FC<MlAnomalyAlertFlyoutProps> = ({
  initialAlert,
  jobIds,
  initialParams,
  onCloseFlyout,
  onSave,
  focusTrapProps,
}) => {
  const {
    services: { triggersActionsUi, ...services },
  } = useMlKibana();

  const AlertFlyout = useMemo(() => {
    if (!triggersActionsUi) return;

    const { ruleTypeRegistry, actionTypeRegistry } = triggersActionsUi;

    const commonProps = {
      plugins: { ...services, ruleTypeRegistry, actionTypeRegistry },
      onCancel: () => {
        onCloseFlyout();
      },
      onSubmit: async () => {
        if (onSave) {
          onSave();
        }
        onCloseFlyout();
      },
    };

    if (initialAlert) {
      return <RuleFormFlyout {...commonProps} id={initialAlert.id} />;
    }

    const params = initialParams ?? {
      jobSelection: {
        jobIds,
      },
    };

    return (
      <RuleFormFlyout
        {...commonProps}
        consumer={PLUGIN_ID}
        ruleTypeId={ML_ALERT_TYPES.ANOMALY_DETECTION}
        initialMetadata={{}}
        initialValues={{
          params,
        }}
        focusTrapProps={focusTrapProps}
      />
    );
    // deps on id to avoid re-rendering on auto-refresh
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggersActionsUi, initialAlert?.id, jobIds, initialParams]);

  return <>{AlertFlyout}</>;
};

interface JobListMlAnomalyAlertFlyoutProps {
  setShowFunction: (callback: Function) => void;
  unsetShowFunction: () => void;
  onSave: () => void;
}

/**
 * Component to wire the Alerting flyout with the Job list view.
 * @param setShowFunction
 * @param unsetShowFunction
 * @constructor
 */
export const JobListMlAnomalyAlertFlyout: FC<JobListMlAnomalyAlertFlyoutProps> = ({
  setShowFunction,
  unsetShowFunction,
  onSave,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [jobIds, setJobIds] = useState<JobId[] | undefined>();

  const showFlyoutCallback = useCallback((jobIdsUpdate: JobId[]) => {
    setJobIds(jobIdsUpdate);
    setIsVisible(true);
  }, []);

  useEffect(() => {
    setShowFunction(showFlyoutCallback);
    return () => {
      unsetShowFunction();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return isVisible && jobIds ? (
    <MlAnomalyAlertFlyout
      jobIds={jobIds}
      onCloseFlyout={() => setIsVisible(false)}
      onSave={() => {
        setIsVisible(false);
        onSave();
      }}
      focusTrapProps={createJobActionFocusTrapProps(jobIds[0])}
    />
  ) : null;
};

interface EditRuleFlyoutProps {
  initialAlert: MlAnomalyDetectionAlertRule & Rule;
  onSave: () => void;
}

export const EditAlertRule: FC<EditRuleFlyoutProps> = ({ initialAlert, onSave }) => {
  const [isVisible, setIsVisible] = useState(false);
  return (
    <>
      <EuiButtonEmpty size="xs" onClick={setIsVisible.bind(null, !isVisible)}>
        {initialAlert.name}
      </EuiButtonEmpty>

      {isVisible ? (
        <MlAnomalyAlertFlyout
          initialAlert={initialAlert}
          onCloseFlyout={setIsVisible.bind(null, false)}
          onSave={() => {
            setIsVisible(false);
            onSave();
          }}
        />
      ) : null}
    </>
  );
};
