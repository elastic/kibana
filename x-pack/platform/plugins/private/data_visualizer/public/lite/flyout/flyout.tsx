/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiFlyoutBody,
  EuiTitle,
  // EuiSpacer,
  // EuiText,
} from '@elastic/eui';

import type { FileUploadResults } from './create_flyout';
import { getFileDataVisualizerLiteWrapper } from './component_wrapper';

// import type { DataViewField, DataView } from '@kbn/data-views-plugin/common';
// import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
// import type { TimeRange } from '@kbn/es-query';
// import { CreateJob } from './create_job';

interface Props {
  onClose?: () => void;
  setUploadResults?: (results: FileUploadResults) => void;
  autoAddSemanticTextField?: boolean;
}

export const FileUploadLiteFlyoutContents: FC<Props> = ({
  onClose,
  setUploadResults,
  autoAddSemanticTextField,
}) => {
  const Wrapper = getFileDataVisualizerLiteWrapper(
    undefined,
    setUploadResults,
    autoAddSemanticTextField
  );
  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h3>
            <FormattedMessage
              id="xpack.ml.embeddables.newJobFromPatternAnalysisFlyout.title"
              defaultMessage="Upload a file"
            />
          </h3>
        </EuiTitle>
        {/* <EuiSpacer size="m" />
        <EuiText size="s">
          <FormattedMessage
            id="xpack.ml.embeddables.newJobFromPatternAnalysisFlyout.secondTitle"
            defaultMessage="Upload a file"
          />
        </EuiText> */}
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {/* <CreateJob dataView={dataView} field={field} query={query} timeRange={timeRange} /> */}
        {Wrapper}
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty iconType="cross" onClick={onClose} flush="left">
              <FormattedMessage
                id="xpack.ml.embeddables.newJobFromPatternAnalysisFlyout.closeButton"
                defaultMessage="Close"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
};
