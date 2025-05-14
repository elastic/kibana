/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useEffect, useState } from 'react';
import { EuiCallOut, EuiLoadingSpinner } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useEnabledFeatures } from '../../../../contexts/ml';
import { ML_DATA_PREVIEW_COUNT } from '../../../../../../common/util/job_utils';
import { useMlApi } from '../../../../contexts/kibana';
import { usePermissionCheck } from '../../../../capabilities/check_capabilities';
import { MLJobEditor } from '../ml_job_editor';
import type { CombinedJob } from '../../../../../../common/types/anomaly_detection_jobs';

interface Props {
  job: CombinedJob;
}

export const DatafeedPreviewPane: FC<Props> = ({ job }) => {
  const {
    jobs: { datafeedPreview },
  } = useMlApi();
  const { showNodeInfo } = useEnabledFeatures();

  const canPreviewDatafeed = usePermissionCheck('canPreviewDatafeed');
  const [loading, setLoading] = useState(false);
  const [previewJson, setPreviewJson] = useState<string | null>('');

  useEffect(() => {
    setLoading(true);
    datafeedPreview(job.datafeed_config.datafeed_id).then((resp) => {
      if (Array.isArray(resp)) {
        if (resp.length === 0) {
          setPreviewJson(null);
        } else {
          setPreviewJson(JSON.stringify(resp.slice(0, ML_DATA_PREVIEW_COUNT), null, 2));
        }
      } else {
        setPreviewJson('');
      }

      setLoading(false);
    });
  }, [datafeedPreview, job]);

  if (canPreviewDatafeed === false) {
    return <InsufficientPermissions />;
  }

  return loading ? (
    <div className="job-loading-spinner" data-test-subj="mlJobDetails loading">
      <EuiLoadingSpinner size="l" />
    </div>
  ) : (
    <>
      {previewJson === null ? (
        <EmptyResults showFrozenTierText={showNodeInfo === true} />
      ) : (
        <MLJobEditor value={previewJson} readOnly={true} />
      )}
    </>
  );
};

const InsufficientPermissions: FC = () => (
  <EuiCallOut
    title={
      <FormattedMessage
        id="xpack.ml.jobsList.jobDetails.noPermissionToViewDatafeedPreviewTitle"
        defaultMessage="You do not have permission to view the datafeed preview"
      />
    }
    color="warning"
    iconType="warning"
  >
    <p>
      <FormattedMessage
        id="xpack.ml.jobsList.jobDetails.pleaseContactYourAdministratorLabel"
        defaultMessage="Please contact your administrator"
      />
    </p>
  </EuiCallOut>
);

const EmptyResults: FC<{ showFrozenTierText: boolean }> = ({ showFrozenTierText }) => (
  <EuiCallOut
    title={
      <FormattedMessage
        id="xpack.ml.jobsList.jobDetails.noResults.title"
        defaultMessage="No results"
      />
    }
    color="warning"
    iconType="warning"
  >
    {showFrozenTierText ? (
      <p>
        <FormattedMessage
          id="xpack.ml.jobsList.jobDetails.noResults.text"
          defaultMessage="Note: Datafeed preview does not return results from frozen tiers."
        />
      </p>
    ) : null}
  </EuiCallOut>
);
