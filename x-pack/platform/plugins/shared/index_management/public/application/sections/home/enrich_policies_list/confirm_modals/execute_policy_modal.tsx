/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState, useRef } from 'react';
import { EuiConfirmModal } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { executeEnrichPolicy } from '../../../../services/api';
import { useAppContext } from '../../../../app_context';

export const ExecutePolicyModal = ({
  policyToExecute,
  callback,
}: {
  policyToExecute: string;
  callback: (data?: { hasExecutedPolicy: boolean }) => void;
}) => {
  const mounted = useRef(false);
  const {
    services: { notificationService },
  } = useAppContext();
  const [isExecuting, setIsExecuting] = useState(false);

  // Since the async action of this component needs to set state after unmounting,
  // we need to track the mounted state of this component to avoid a memory leak.
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const handleExecutePolicy = () => {
    setIsExecuting(true);

    executeEnrichPolicy(policyToExecute)
      .then(({ data, error }) => {
        if (data) {
          const successMessage = i18n.translate(
            'xpack.idxMgmt.enrichPolicies.executeModal.successExecuteNotificationMessage',
            { defaultMessage: 'Executed {policyToExecute}', values: { policyToExecute } }
          );
          notificationService.showSuccessToast(successMessage);

          return callback({ hasExecutedPolicy: true });
        }

        if (error) {
          const errorMessage = i18n.translate(
            'xpack.idxMgmt.enrichPolicies.executeModal.errorExecuteNotificationMessage',
            {
              defaultMessage: "Error executing enrich policy: ''{error}''",
              values: { error: error.message },
            }
          );
          notificationService.showDangerToast(errorMessage);
        }

        callback();
      })
      .finally(() => {
        if (mounted.current) {
          setIsExecuting(false);
        }
      });
  };

  const handleOnCancel = () => {
    callback();
  };

  return (
    <EuiConfirmModal
      data-test-subj="executePolicyModal"
      title={i18n.translate('xpack.idxMgmt.enrichPolicies.executeModal.confirmTitle', {
        defaultMessage: 'Execute enrich policy',
      })}
      onCancel={handleOnCancel}
      onConfirm={handleExecutePolicy}
      cancelButtonText={i18n.translate('xpack.idxMgmt.enrichPolicies.executeModal.cancelButton', {
        defaultMessage: 'Cancel',
      })}
      confirmButtonText={i18n.translate('xpack.idxMgmt.enrichPolicies.executeModal.executeButton', {
        defaultMessage: 'Execute',
      })}
      confirmButtonDisabled={isExecuting}
    >
      <p>
        <FormattedMessage
          id="xpack.idxMgmt.enrichPolicies.executeModal.bodyCopy"
          defaultMessage="You are about to execute the enrich policy {policy}."
          values={{
            policy: <strong>{policyToExecute}</strong>,
          }}
        />
      </p>
    </EuiConfirmModal>
  );
};
