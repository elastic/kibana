/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { ReactNode, useCallback, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { PROXY_MODE, SNIFF_MODE } from '../../../../../../common/constants';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
} from '../../../../../shared_imports';
import { ClusterPayload } from '../../../../../../common/lib';
import { RequestFlyout } from './request_flyout';

interface Props {
  showRequest: boolean;
  disabled?: boolean;
  isSaving?: boolean;
  handleNext: () => void;
  onBack?: () => void;
  confirmFormText: ReactNode;
  backFormText?: ReactNode;
  cluster?: ClusterPayload;
  nextButtonTestSubj: string;
  backButtonTestSubj?: string;
  previousClusterMode?: typeof PROXY_MODE | typeof SNIFF_MODE;
}

export const ActionButtons: React.FC<Props> = ({
  showRequest,
  handleNext,
  disabled,
  isSaving,
  onBack,
  confirmFormText,
  backFormText,
  cluster,
  nextButtonTestSubj,
  backButtonTestSubj,
  previousClusterMode,
}) => {
  const [isRequestVisible, setIsRequestVisible] = useState(false);
  const toggleRequest = useCallback(() => {
    setIsRequestVisible((prev) => !prev);
  }, []);

  return (
    <EuiFlexGroup wrap justifyContent="center">
      <EuiFlexItem>
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
            {onBack && (
              <EuiButtonEmpty color="primary" onClick={onBack} data-test-subj={backButtonTestSubj}>
                {backFormText}
              </EuiButtonEmpty>
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem>
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
        <RequestFlyout
          cluster={cluster}
          close={() => setIsRequestVisible(false)}
          previousClusterMode={previousClusterMode}
        />
      ) : null}
    </EuiFlexGroup>
  );
};
