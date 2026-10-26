/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useLayoutEffect, useCallback } from 'react';
import usePromise from 'react-use/lib/usePromise';
import type { History } from 'history';
import { EuiLoadingSpinner, EuiPageTemplate } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { ToastsStart } from '@kbn/core/public';

import type { ManagementAppMountParams } from '@kbn/management-plugin/public';
import { PipelineEditor } from './components/pipeline_editor';
import { PipelineAppHeader } from './components/pipeline_app_header';
import { Pipeline } from '../models/pipeline';
import * as Breadcrumbs from './breadcrumbs';

const usePipeline = (
  pipelineService: any,
  logstashLicenseService: any,
  toasts: ToastsStart,
  shouldClone: boolean,
  id?: string
) => {
  const mounted = usePromise();
  const [pipeline, setPipeline] = useState<any>(null);

  useLayoutEffect(() => {
    (async () => {
      if (!id) {
        return setPipeline(new Pipeline());
      }

      try {
        const result = await mounted(pipelineService.loadPipeline(id) as Promise<any>);
        setPipeline(shouldClone ? result.clone : result);
      } catch (e) {
        await logstashLicenseService.checkValidity();
        if (e.status !== 403) {
          toasts.addDanger(
            i18n.translate('xpack.logstash.couldNotLoadPipelineErrorNotification', {
              defaultMessage: `Couldn't load pipeline. Error: ''{errStatusText}''.`,
              values: {
                errStatusText: e.statusText,
              },
            })
          );
        }
      }
    })();
  }, [pipelineService, id, mounted, shouldClone, logstashLicenseService, toasts]);

  return pipeline;
};

const getEditorTitle = (shouldClone: boolean, id?: string, pipelineId?: string): string => {
  if (shouldClone && id) {
    return i18n.translate('xpack.logstash.pipelineEditor.clonePipelineTitle', {
      defaultMessage: 'Clone Pipeline "{id}"',
      values: { id },
    });
  }
  if (id) {
    return i18n.translate('xpack.logstash.pipelineEditor.editPipelineTitle', {
      defaultMessage: 'Edit Pipeline "{id}"',
      values: { id: pipelineId ?? id },
    });
  }
  return i18n.translate('xpack.logstash.pipelineEditor.createPipelineTitle', {
    defaultMessage: 'Create Pipeline',
  });
};

interface EditProps {
  pipelineService: any;
  logstashLicenseService: any;
  toasts: ToastsStart;
  history: History;
  setBreadcrumbs: ManagementAppMountParams['setBreadcrumbs'];

  // URL params
  id?: string;
}

export const PipelineEditView: React.FC<EditProps> = ({
  pipelineService,
  logstashLicenseService,
  toasts,
  history,
  setBreadcrumbs,
  id,
}) => {
  const params = new URLSearchParams(history.location.search);
  const shouldClone = params.get('clone') === '';

  const pipeline = usePipeline(pipelineService, logstashLicenseService, toasts, shouldClone, id);

  const close = useCallback(() => {
    history.push('/');
  }, [history]);
  const open = useCallback(
    (newId: string) => {
      history.push(`/pipeline/${newId}/edit`);
    },
    [history]
  );

  const isNewPipeline = !id || shouldClone;
  const editorPipelineId = pipeline?.id ?? id ?? '';
  setBreadcrumbs(
    isNewPipeline
      ? Breadcrumbs.getPipelineCreateBreadcrumbs()
      : Breadcrumbs.getPipelineEditBreadcrumbs(editorPipelineId)
  );

  const title = getEditorTitle(shouldClone, id, pipeline?.id);

  let body: React.ReactNode;
  if (!pipeline) {
    body = (
      <EuiPageTemplate.EmptyPrompt
        title={<EuiLoadingSpinner size="xl" />}
        body={
          <FormattedMessage
            id="xpack.logstash.pipelineEditor.loadingPipelineDescription"
            defaultMessage="Loading pipeline…"
          />
        }
      />
    );
  } else {
    body = (
      <PipelineEditor
        id={id}
        clone={shouldClone}
        close={close}
        open={open}
        isNewPipeline={isNewPipeline}
        pipeline={pipeline}
        pipelineService={pipelineService}
        toastNotifications={toasts}
        licenseService={logstashLicenseService}
      />
    );
  }

  return (
    <>
      <PipelineAppHeader title={title} history={history} showBack />
      {body}
    </>
  );
};
