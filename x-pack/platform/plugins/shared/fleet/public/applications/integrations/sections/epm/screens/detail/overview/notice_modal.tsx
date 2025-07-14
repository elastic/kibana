/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import {
  EuiCodeBlock,
  EuiModal,
  EuiModalBody,
  EuiModalHeader,
  EuiModalFooter,
  EuiModalHeaderTitle,
  EuiButton,
  EuiSkeletonText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { sendGetFileByPath, useStartServices } from '../../../../../hooks';

interface Props {
  noticePath: string;
  onClose: () => void;
}

export const NoticeModal: React.FunctionComponent<Props> = ({ noticePath, onClose }) => {
  const modalTitleId = useGeneratedHtmlId();
  const { notifications } = useStartServices();
  const [notice, setNotice] = useState<string | undefined>(undefined);

  useEffect(() => {
    async function fetchData() {
      try {
        const { data } = await sendGetFileByPath(noticePath);
        setNotice(data || '');
      } catch (err) {
        notifications.toasts.addError(err, {
          title: i18n.translate('xpack.fleet.epm.errorLoadingNotice', {
            defaultMessage: 'Error loading NOTICE.txt',
          }),
        });
      }
    }
    fetchData();
  }, [noticePath, notifications]);
  return (
    <EuiModal maxWidth={true} onClose={onClose} aria-labelledby={modalTitleId}>
      <EuiModalHeader>
        <EuiModalHeaderTitle id={modalTitleId}>NOTICE.txt</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiCodeBlock overflowHeight={360}>
          {notice ? (
            notice
          ) : (
            // Simulate a long notice while loading
            <>
              <p>
                <EuiSkeletonText lines={5} />
              </p>
              <p>
                <EuiSkeletonText lines={6} />
              </p>
            </>
          )}
        </EuiCodeBlock>
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButton color="primary" fill onClick={onClose}>
          <FormattedMessage id="xpack.fleet.epm.noticeModalCloseBtn" defaultMessage="Close" />
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};