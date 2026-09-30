/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
import type { RouteComponentProps } from 'react-router-dom';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { EuiButton, EuiPageTemplate, EuiSpacer } from '@elastic/eui';
import { KbnDangerCallout, KbnWarningCallout } from '@kbn/ui-callout';

import type { Pipeline } from '../../../../common/types';
import { useKibana, SectionLoading } from '../../../shared_imports';

import { getListPath } from '../../services/navigation';
import { PipelineForm, PipelineAppHeader } from '../../components';
import { useRedirectToPathOrRedirectPath } from '../../hooks';
import { getErrorText } from '../utils';
import { normalizePipelineNameFromParams } from '../../lib/normalize_pipeline_name_from_params';

interface MatchParams {
  name: string;
}

const ManagedPipelineCallout = () => (
  <KbnDangerCallout
    data-test-subj="managedPipelineCallout"
    title={
      <FormattedMessage
        id="xpack.ingestPipelines.edit.managedCalloutTitle"
        defaultMessage="Editing a managed pipeline can break Kibana."
      />
    }
    text={
      <FormattedMessage
        id="xpack.ingestPipelines.edit.managedCalloutDescription"
        defaultMessage="Managed pipelines are critical for internal operations."
      />
    }
  />
);

const DeprecatedPipelineCallout = () => (
  <KbnWarningCallout
    data-test-subj="deprecatedPipelineCallout"
    title={
      <FormattedMessage
        id="xpack.ingestPipelines.edit.deprecatedCalloutTitle"
        defaultMessage="This pipeline is deprecated"
      />
    }
    text={
      <FormattedMessage
        id="xpack.ingestPipelines.edit.deprecatedCalloutDescription"
        defaultMessage="This pipeline is no longer supported and might be removed in a future release. Instead, use one of the other pipelines available or create a new one."
      />
    }
  />
);

export const PipelinesEdit: React.FunctionComponent<RouteComponentProps<MatchParams>> = ({
  match: {
    params: { name },
  },
  history,
}) => {
  const { services } = useKibana();

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<any>(null);
  const redirectToPathOrRedirectPath = useRedirectToPathOrRedirectPath(history);

  const decodedPipelineName = normalizePipelineNameFromParams(name) ?? '';

  const {
    error,
    data: pipeline,
    isLoading,
    resendRequest,
  } = services.api.useLoadPipeline(decodedPipelineName);

  const onSave = async (updatedPipeline: Pipeline) => {
    setIsSaving(true);
    setSaveError(null);

    const { error: savePipelineError } = await services.api.updatePipeline(updatedPipeline);

    setIsSaving(false);

    if (savePipelineError) {
      setSaveError(savePipelineError);
      return;
    }

    redirectToPathOrRedirectPath(getListPath({ inspectedPipelineName: updatedPipeline.name }));
  };

  const onCancel = () => {
    redirectToPathOrRedirectPath(getListPath());
  };

  useEffect(() => {
    services.breadcrumbs.setBreadcrumbs('edit');
  }, [services.breadcrumbs]);

  let body: React.ReactNode;
  if (isLoading) {
    body = (
      <SectionLoading>
        <FormattedMessage
          id="xpack.ingestPipelines.edit.loadingPipelinesDescription"
          defaultMessage="Loading pipeline…"
        />
      </SectionLoading>
    );
  } else if (error) {
    body = (
      <EuiPageTemplate.EmptyPrompt
        color="danger"
        iconType="warning"
        title={
          <h2>
            <FormattedMessage
              id="xpack.ingestPipelines.edit.fetchPipelineError"
              defaultMessage="Unable to load ''{name}''"
              values={{ name: decodedPipelineName }}
            />
          </h2>
        }
        body={<p>{getErrorText(error)}</p>}
        actions={
          <EuiButton onClick={resendRequest} iconType="refresh" color="danger">
            <FormattedMessage
              id="xpack.ingestPipelines.edit.fetchPipelineReloadButton"
              defaultMessage="Try again"
            />
          </EuiButton>
        }
      />
    );
  } else {
    body = (
      <>
        {pipeline?.isManaged && (
          <>
            <ManagedPipelineCallout />
            <EuiSpacer size="l" />
          </>
        )}
        {pipeline?.deprecated && (
          <>
            <DeprecatedPipelineCallout />
            <EuiSpacer size="l" />
          </>
        )}

        <PipelineForm
          onSave={onSave}
          onCancel={onCancel}
          isSaving={isSaving}
          saveError={saveError}
          defaultValue={pipeline as Pipeline}
          isEditing={true}
        />
      </>
    );
  }

  return (
    <>
      <PipelineAppHeader
        title={i18n.translate('xpack.ingestPipelines.edit.pageTitle', {
          defaultMessage: "Edit pipeline ''{name}''",
          values: { name: decodedPipelineName },
        })}
        history={history}
        docLink={services.documentation.getCreatePipelineUrl()}
      />
      {body}
      {services.consolePlugin?.EmbeddableConsole ? (
        <services.consolePlugin.EmbeddableConsole />
      ) : null}
    </>
  );
};
