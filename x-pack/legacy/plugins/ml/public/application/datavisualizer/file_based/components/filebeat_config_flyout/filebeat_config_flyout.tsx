/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useState, useEffect } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiFlyout,
  EuiFlyoutFooter,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiButtonEmpty,
  EuiTitle,
  EuiFlyoutBody,
  EuiSpacer,
  EuiTextArea,
} from '@elastic/eui';
import { createFilebeatConfig } from './filebeat_config';
import { useMlKibana } from '../../../../contexts/kibana';

const EDITOR_HEIGHT = '800px';
export enum EDITOR_MODE {
  HIDDEN,
  READONLY,
  EDITABLE,
}
interface Props {
  index: string;
  results: any;
  indexPatternId: string;
  ingestPipelineId: string;
  closeFlyout(): void;
}
export const FilebeatConfigFlyout: FC<Props> = ({
  index,
  results,
  indexPatternId,
  ingestPipelineId,
  closeFlyout,
}) => {
  const [fileBeatConfig, setFileBeatConfig] = useState('');
  const [username, setUsername] = useState<string | null>(null);
  const {
    services: { security },
  } = useMlKibana();

  useEffect(() => {
    security.authc.getCurrentUser().then(user => {
      setUsername(user.username);
    });
  }, []);

  useEffect(() => {
    const config = createFilebeatConfig(index, results, indexPatternId, ingestPipelineId, username);
    setFileBeatConfig(config);
  }, [username]);

  function onCopyToClipboard() {}

  return (
    <EuiFlyout onClose={closeFlyout} hideCloseButton size={'m'}>
      <EuiFlyoutBody>
        <EuiFlexGroup>
          <Contents value={fileBeatConfig} />
        </EuiFlexGroup>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty iconType="cross" onClick={closeFlyout} flush="left">
              <FormattedMessage
                id="xpack.ml.fileDatavisualizer.fileBeatConfigFlyout.closeButton"
                defaultMessage="Close"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton onClick={onCopyToClipboard} fill>
              <FormattedMessage
                id="xpack.ml.fileDatavisualizer.fileBeatConfigFlyout.copyButton"
                defaultMessage="Copy to clipboard"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};

const Contents: FC<{
  value: string;
}> = ({ value }) => {
  return (
    <EuiFlexItem>
      <EuiTitle size="s">
        <h5>
          <FormattedMessage
            id="xpack.ml.fileDatavisualizer.resultsLinks.fileBeatConfig"
            defaultMessage="Filebeat config"
          />
        </h5>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiTextArea fullWidth={true} aria-label="aria label" value={value} onChange={() => {}} />
    </EuiFlexItem>
  );
};
