/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiButton, EuiButtonEmpty, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React, { ReactNode, useCallback, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { ClusterPayload } from '../../../../../../common/lib';
import { RequestFlyout } from './request_flyout';

interface Props {
  showRequest: boolean;
  disabled?: boolean;
  isSaving?: boolean;
  handleNext: () => void;
  cancel?: () => void;
  confirmFormText: ReactNode;
  cluster?: ClusterPayload;
  nextButtonTestSubj: string;
  maxWidith?: number;
}

export const ActionButtons: React.FC<Props> = ({
  showRequest,
  handleNext,
  disabled,
  isSaving,
  cancel,
  confirmFormText,
  cluster,
  nextButtonTestSubj,
  maxWidith,
}) => {
  const [isRequestVisible, setIsRequestVisible] = useState(false);
  const toggleRequest = useCallback(() => {
    setIsRequestVisible((prev) => !prev);
  }, []);

  return (
    <EuiFlexGroup wrap justifyContent="center">
      <EuiFlexItem style={{ maxWidth: maxWidith }}>
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <EuiButton
              color="primary"
              fill
              onClick={handleNext}
              disabled={disabled}
              isLoading={isSaving}
              data-test-subj={nextButtonTestSubj}
            >
              {confirmFormText}
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty color="primary" onClick={cancel}>
              <FormattedMessage
                id="xpack.remoteClusters.remoteClusterForm.cancelButtonLabel"
                defaultMessage="Cancel"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem style={{ maxWidth: maxWidith }}>
        {showRequest && (
          <EuiFlexGroup justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty onClick={toggleRequest} data-test-subj="remoteClustersRequestButton">
                {isRequestVisible ? (
                  <FormattedMessage
                    id="xpack.remoteClusters.remoteClusterForm.hideRequestButtonLabel"
                    defaultMessage="Hide request"
                  />
                ) : (
                  <FormattedMessage
                    id="xpack.remoteClusters.remoteClusterForm.showRequestButtonLabel"
                    defaultMessage="Show request"
                  />
                )}
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
      </EuiFlexItem>
      {isRequestVisible && cluster ? (
        <RequestFlyout cluster={cluster} close={() => setIsRequestVisible(false)} />
      ) : null}
    </EuiFlexGroup>
  );
};
