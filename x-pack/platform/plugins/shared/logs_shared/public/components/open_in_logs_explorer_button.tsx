/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FormattedMessage } from '@kbn/i18n-react';
import type { EuiButtonEmptyProps } from '@elastic/eui';
import { EuiButtonEmpty } from '@elastic/eui';
import React from 'react';

type OpenInLogsExplorerButtonProps = Pick<EuiButtonEmptyProps, 'href' | 'flush' | 'size'> & {
  testSubject: string;
};

const OpenInLogsExplorerButton = ({ testSubject, ...rest }: OpenInLogsExplorerButtonProps) => {
  return (
    <EuiButtonEmpty
      iconType="discoverApp"
      data-test-subj={testSubject ?? 'logsSharedOpenInLogsExplorerButton'}
      {...rest}
    >
      <FormattedMessage
        id="xpack.logsShared.openInLogsExplorerButtonText"
        defaultMessage="Open in Discover"
      />
    </EuiButtonEmpty>
  );
};

// eslint-disable-next-line import/no-default-export
export default OpenInLogsExplorerButton;
