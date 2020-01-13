/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, FC, useState, useContext, useEffect } from 'react';
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
  EuiLoadingSpinner,
} from '@elastic/eui';
import { CombinedJob } from '../../../../common/job_creator/configs';
import { MLJobEditor } from '../../../../../jobs_list/components/ml_job_editor';
import { JobCreatorContext } from '../../job_creator_context';
import { mlJobService } from '../../../../../../services/job_service';
import { ML_DATA_PREVIEW_COUNT } from '../../../../../../../../common/util/job_utils';

const EDITOR_HEIGHT = '800px';
export enum EDITOR_MODE {
  HIDDEN,
  READONLY,
  EDITABLE,
}
interface Props {
  isDisabled: boolean;
}
export const DatafeedPreviewFlyout: FC<Props> = ({ isDisabled }) => {
  const { jobCreator } = useContext(JobCreatorContext);
  const [showFlyout, setShowFlyout] = useState(false);
  const [previewJsonString, setPreviewJsonString] = useState('');
  const [loading, setLoading] = useState(false);

  function toggleFlyout() {
    setShowFlyout(!showFlyout);
  }

  useEffect(() => {
    if (showFlyout === true) {
      loadDataPreview();
    }
  }, [showFlyout]);

  async function loadDataPreview() {
    setLoading(true);
    setPreviewJsonString('');
    const combinedJob: CombinedJob = {
      ...jobCreator.jobConfig,
      datafeed_config: jobCreator.datafeedConfig,
    };

    if (combinedJob.datafeed_config && combinedJob.datafeed_config.indices.length) {
      try {
        const resp = await mlJobService.searchPreview(combinedJob);
        const data = resp.aggregations
          ? resp.aggregations.buckets.buckets.slice(0, ML_DATA_PREVIEW_COUNT)
          : resp.hits.hits;

        setPreviewJsonString(JSON.stringify(data, null, 2));
      } catch (error) {
        setPreviewJsonString(JSON.stringify(error, null, 2));
      }
      setLoading(false);
    } else {
      const errorText = i18n.translate(
        'xpack.ml.newJob.wizard.datafeedPreviewFlyout.datafeedDoesNotExistLabel',
        {
          defaultMessage: 'Datafeed does not exist',
        }
      );
      setPreviewJsonString(errorText);
    }
  }

  return (
    <Fragment>
      <FlyoutButton onClick={toggleFlyout} isDisabled={isDisabled} />

      {showFlyout === true && isDisabled === false && (
        <EuiFlyout onClose={() => setShowFlyout(false)} hideCloseButton size="m">
          <EuiFlyoutBody>
            <Contents
              title={i18n.translate('xpack.ml.newJob.wizard.datafeedPreviewFlyout.title', {
                defaultMessage: 'Datafeed preview',
              })}
              value={previewJsonString}
              loading={loading}
            />
          </EuiFlyoutBody>
          <EuiFlyoutFooter>
            <EuiFlexGroup justifyContent="spaceBetween">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty iconType="cross" onClick={() => setShowFlyout(false)} flush="left">
                  <FormattedMessage
                    id="xpack.ml.newJob.wizard.datafeedPreviewFlyout.closeButton"
                    defaultMessage="Close"
                  />
                </EuiButtonEmpty>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlyoutFooter>
        </EuiFlyout>
      )}
    </Fragment>
  );
};

const FlyoutButton: FC<{ isDisabled: boolean; onClick(): void }> = ({ isDisabled, onClick }) => {
  return (
    <EuiButtonEmpty
      onClick={onClick}
      isDisabled={isDisabled}
      data-test-subj="mlJobWizardButtonPreviewJobJson"
    >
      <FormattedMessage
        id="xpack.ml.newJob.wizard.datafeedPreviewFlyout.showButton"
        defaultMessage="Datafeed preview"
      />
    </EuiButtonEmpty>
  );
};

const Contents: FC<{
  title: string;
  value: string;
  loading: boolean;
}> = ({ title, value, loading }) => {
  return (
    <EuiFlexItem>
      <EuiTitle size="s">
        <h5>{title}</h5>
      </EuiTitle>
      <EuiSpacer size="s" />
      {loading === true ? (
        <EuiFlexGroup justifyContent="spaceAround">
          <EuiFlexItem grow={false}>
            <EuiSpacer size="xxl" />
            <EuiLoadingSpinner size="l" />
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : (
        <MLJobEditor value={value} height={EDITOR_HEIGHT} readOnly={true} />
      )}
    </EuiFlexItem>
  );
};
