/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React, { useEffect } from 'react';
import type { RouteComponentProps } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { SectionLoading, useKibana, attemptToURIDecode } from '../../../shared_imports';

import { PipelinesCreate } from '../pipelines_create';
import { getErrorText } from '../utils';

export interface ParamProps {
  sourceName: string;
}

/**
 * This section is a wrapper around the create section where we receive a pipeline name
 * to load and set as the source pipeline for the {@link PipelinesCreate} form.
 */
export const PipelinesClone: FunctionComponent<RouteComponentProps<ParamProps>> = (props) => {
  const { sourceName } = props.match.params;
  const { services } = useKibana();

  let normalizedSourceName = sourceName;
  if (!window.location.pathname.endsWith(sourceName)) {
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
    normalizedSourceName = window.location.pathname.split('/').pop() || sourceName;
  }

  const decodedSourceName = attemptToURIDecode(normalizedSourceName)!;
  const {
    error,
    data: pipeline,
    isLoading,
    isInitialRequest,
  } = services.api.useLoadPipeline(decodedSourceName);

  useEffect(() => {
    if (error && !isLoading) {
      services.notifications!.toasts.addError(new Error(getErrorText(error)), {
        title: i18n.translate('xpack.ingestPipelines.clone.loadSourcePipelineErrorTitle', {
          defaultMessage: 'Cannot load {name}.',
          values: { name: sourceName },
        }),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error, isLoading]);

  if (isLoading && isInitialRequest) {
    return (
      <SectionLoading>
        <FormattedMessage
          id="xpack.ingestPipelines.clone.loadingPipelinesDescription"
          defaultMessage="Loading pipeline…"
        />
      </SectionLoading>
    );
  } else {
    // We still show the create form even if we were not able to load the
    // latest pipeline data.
    const sourcePipeline = pipeline ? { ...pipeline, name: `${pipeline.name}-copy` } : undefined;
    return <PipelinesCreate {...props} sourcePipeline={sourcePipeline} />;
  }
};
