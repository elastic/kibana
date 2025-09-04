/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
import type { RouteComponentProps } from 'react-router-dom';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiPageHeader,
  EuiSpacer,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiPageTemplate,
} from '@elastic/eui';

import type { Pipeline } from '../../../../common/types';
import { useKibana, SectionLoading, attemptToURIDecode } from '../../../shared_imports';

import { getListPath } from '../../services/navigation';
import { PipelineForm } from '../../components';
import { useRedirectToPathOrRedirectPath } from '../../hooks';
import { getErrorText } from '../utils';

interface MatchParams {
  name: string;
}

const ManagedPipelineCallout = () => (
  <EuiCallOut
    color="danger"
    iconType="warning"
    data-test-subj="managedPipelineCallout"
    title={
      <FormattedMessage
        id="xpack.ingestPipelines.edit.managedCalloutTitle"
        defaultMessage="Editing a managed pipeline can break Kibana."
      />
    }
  >
    <FormattedMessage
      id="xpack.ingestPipelines.edit.managedCalloutDescription"
      defaultMessage="Managed pipelines are critical for internal operations."
    />
  </EuiCallOut>
);

const DeprecatedPipelineCallout = () => (
  <EuiCallOut
    color="warning"
    iconType="warning"
    data-test-subj="deprecatedPipelineCallout"
    title={
      <FormattedMessage
        id="xpack.ingestPipelines.edit.deprecatedCalloutTitle"
        defaultMessage="This pipeline is deprecated"
      />
    }
  >
    <FormattedMessage
      id="xpack.ingestPipelines.edit.deprecatedCalloutDescription"
      defaultMessage="This pipeline is no longer supported and might be removed in a future release. Instead, use one of the other pipelines available or create a new one."
    />
  </EuiCallOut>
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

  let normalizedName = name;
  if (!window.location.pathname.endsWith(name)) {
    // Context:

    // When we client-side react-router/history navigate to this edit page from pipelines list,
    // we double encode the pathname part like this: history.push('/<basename>/edit/' + encodeURIComponent(encodeURIComponent('<sourceName>')))

    // Why? Because if we encode it once, history lib will automatically decode it upon loading the page
    // incorrectly mangling the resulting pipeline name, due to a bug in history library

    // And the bug being incorrect choice of decode api call (decodeURI instead of decodeURIComponent)
    // see this history v4 bug https://github.com/remix-run/history/issues/786 (it was fixed in history v5, i.e. react-router v6)
    // and this offending line https://github.com/remix-run/history/blob/6104a6a2e40ae17a47a297621afff9a6cb184bfc/modules/LocationUtils.js#L36

    // decodeURI cannot decode special characters like `#` and `@` etc which can be valid in pipeline names.
    // For example 'asd!@#$ asd%^&' -> encodeURIComponent -> 'asd!%40%23%24%20asd%25%5E%26' -> decodeURI -> 'asd!%40%23%24 asd%^%26'
    // I.e. (cannot decode @#$^& signs), resulting decoded string is not the original string anymore.
    // Furthermore it's a malformed URI now for decodeURIComponent and cannot be decoded back to the original string.

    // So we double encode it to make sure all special characters are protected from decodeURI
    // with a layer of encoding that decodeURI can decode properly, and then our client side
    // decodeURIComponent call can decode the remaining encoded layer of special characters properly back to the original string.

    // Problem:

    // If then the user copies that already pre-decoded URL from the URL bar and opens it in a new tab or
    // reloads the page, the reloaded page will invoke react-routers/history decoding against it again.
    // But this time the pathname part is no longer double encoded in the URL, and it's only single encoded now.
    // So history lib decodeURI call will decode it and mangle it as described above.

    // Solution:

    // A good indication that the pathname part is mangled is when
    // window.location.pathname parts visible in the browser addressbar,
    // don't match the ones from react router history.location.pathname parts.
    // (and match.params.name is in sync with react-router's history.location.pathname part)
    //
    // So if that happens, we just take the last part of window.location.pathname as the source
    // of truth for the pipeline name we want to load as safely parse it afterwards
    normalizedName = window.location.pathname.split('/').pop() || name;
  }

  const decodedPipelineName = attemptToURIDecode(normalizedName)!;

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

  if (isLoading) {
    return (
      <SectionLoading>
        <FormattedMessage
          id="xpack.ingestPipelines.edit.loadingPipelinesDescription"
          defaultMessage="Loading pipeline…"
        />
      </SectionLoading>
    );
  }

  if (error) {
    return (
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
  }

  return (
    <>
      <EuiPageHeader
        bottomBorder
        pageTitle={
          <span data-test-subj="pageTitle">
            <FormattedMessage
              id="xpack.ingestPipelines.edit.pageTitle"
              defaultMessage="Edit pipeline ''{name}''"
              values={{ name: decodedPipelineName }}
            />
          </span>
        }
        rightSideItems={[
          <EuiButtonEmpty
            size="s"
            flush="right"
            href={services.documentation.getCreatePipelineUrl()}
            target="_blank"
            iconType="question"
            data-test-subj="documentationLink"
          >
            <FormattedMessage
              id="xpack.ingestPipelines.edit.docsButtonLabel"
              defaultMessage="Edit pipeline docs"
            />
          </EuiButtonEmpty>,
        ]}
      />

      <EuiSpacer size="l" />
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
      {services.consolePlugin?.EmbeddableConsole ? (
        <services.consolePlugin.EmbeddableConsole />
      ) : null}
    </>
  );
};
