/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiFlyout,
  EuiFlyoutFooter,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiTitle,
  EuiFlyoutBody,
  EuiSpacer,
} from '@elastic/eui';
import { JobCreatorType } from '../../../common/job_creator';
import { MLJobEditor } from '../../../../jobs_list/components/ml_job_editor';

interface Props {
  jobCreator: JobCreatorType;
  closeFlyout: () => void;
}
export const JsonFlyout: FC<Props> = ({ jobCreator, closeFlyout }) => {
  return (
    <EuiFlyout onClose={closeFlyout} hideCloseButton size="l">
      <EuiFlyoutBody>
        <EuiFlexGroup>
          <Contents
            title={i18n.translate('xpack.ml.newJob.wizard.summaryStep.jsonFlyout.job.title', {
              defaultMessage: 'Job configuration JSON',
            })}
            value={jobCreator.formattedJobJson}
          />
          <Contents
            title={i18n.translate('xpack.ml.newJob.wizard.summaryStep.jsonFlyout.datafeed.title', {
              defaultMessage: 'Datafeed configuration JSON',
            })}
            value={jobCreator.formattedDatafeedJson}
          />
        </EuiFlexGroup>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty iconType="cross" onClick={closeFlyout} flush="left">
              <FormattedMessage
                id="xpack.ml.newJob.wizard.summaryStep.jsonFlyout.closeLink"
                defaultMessage="Close"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};

const Contents: FC<{ title: string; value: string }> = ({ title, value }) => {
  const EDITOR_HEIGHT = '800px';
  return (
    <EuiFlexItem>
      <EuiTitle size="s">
        <h5>{title}</h5>
      </EuiTitle>
      <EuiSpacer size="s" />
      <MLJobEditor value={value} height={EDITOR_HEIGHT} readOnly={true} />
    </EuiFlexItem>
  );
};
