/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import type { RouteComponentProps } from 'react-router-dom';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { AppHeader, type AppHeaderMenu } from '@kbn/app-header';

import { EuiButton, EuiSpacer, EuiPageTemplate } from '@elastic/eui';
import type { Location } from 'history';

import type { Pipeline } from '../../../../common/types';
import { useKibana, SectionLoading } from '../../../shared_imports';
import { UIM_PIPELINES_LIST_LOAD } from '../../constants';
import {
  getEditPath,
  getClonePath,
  getCreateFromCsvPath,
  getCreatePath,
  getManageProcessorsPath,
} from '../../services/navigation';
import { ingestPipelinesListTitle } from '../../components';
import { useCheckManageProcessorsPrivileges } from '../manage_processors';

import { EmptyList } from './empty_list';
import { PipelineTable } from './table';
import { PipelineDeleteModal } from './delete_modal';
import { getErrorText } from '../utils';
import { PipelineFlyout } from './pipeline_flyout';

const listDescription = i18n.translate('xpack.ingestPipelines.list.pipelinesDescription', {
  defaultMessage:
    'Use ingest pipelines to remove or transform fields, extract values from text, and enrich your data before indexing into Elasticsearch.',
});

const createPipelineLabel = i18n.translate(
  'xpack.ingestPipelines.list.table.createPipelineDropdownLabel',
  {
    defaultMessage: 'Create pipeline',
  }
);

const newPipelineLabel = i18n.translate(
  'xpack.ingestPipelines.list.table.createPipelineButtonLabel',
  {
    defaultMessage: 'New pipeline',
  }
);

const newPipelineFromCsvLabel = i18n.translate(
  'xpack.ingestPipelines.list.table.createPipelineFromCsvButtonLabel',
  {
    defaultMessage: 'New pipeline from CSV',
  }
);

const manageProcessorsLabel = i18n.translate(
  'xpack.ingestPipelines.list.manageProcessorsLinkText',
  {
    defaultMessage: 'Manage processors',
  }
);

const getPipelineNameFromLocation = (location: Location) => {
  const params = new URLSearchParams(location.search);
  return params.get('pipeline');
};

export const PipelinesList: React.FunctionComponent<RouteComponentProps> = ({ history }) => {
  const { services } = useKibana();

  const pipelineNameFromLocation = getPipelineNameFromLocation(history.location);

  const [showFlyout, setShowFlyout] = useState<boolean>(pipelineNameFromLocation !== null);

  const [pipelinesToDelete, setPipelinesToDelete] = useState<Pipeline[]>([]);

  const { data, isLoading, error, resendRequest } = services.api.useLoadPipelines();

  const hasManageProcessorsPrivileges = useCheckManageProcessorsPrivileges();
  // Track component loaded
  useEffect(() => {
    services.metric.trackUiMetric(UIM_PIPELINES_LIST_LOAD);
    services.breadcrumbs.setBreadcrumbs('home');
  }, [services.metric, services.breadcrumbs]);

  const goToEditPipeline = (pipelineName: string) => {
    // this double encoding (+1 in getEditPath) is a
    // temporary workaround for history v4 bug with url-encoded
    // route params see https://github.com/elastic/kibana/issues/234500
    const encodedParam = encodeURIComponent(pipelineName);
    history.push(getEditPath({ pipelineName: encodedParam }));
  };

  const goToClonePipeline = (clonedPipelineName: string) => {
    // this double encoding (+1 in getClonePath) is a
    // temporary workaround for history v4 bug with url-encoded
    // route params see https://github.com/elastic/kibana/issues/234500
    const encodedParam = encodeURIComponent(clonedPipelineName);
    history.push(getClonePath({ clonedPipelineName: encodedParam }));
  };

  const goToCreatePipeline = (pipelineName: string) => {
    history.push(getCreatePath({ pipelineName }));
  };

  const goHome = () => {
    setShowFlyout(false);

    // When redirecting the user to the list of pipelines, we want to only clean
    // up the pipeline query param as there might be other query params (for example:
    // search or filters) that we want to keep.
    const params = new URLSearchParams(history.location.search);
    params.delete('pipeline');

    history.push({
      pathname: '',
      search: params.toString(),
    });
  };

  const showCreateInHeader = Boolean(data && data.length > 0) && !error;
  const createPath = getCreatePath();
  const createFromCsvPath = getCreateFromCsvPath();
  const manageProcessorsPath = getManageProcessorsPath();

  let menu: AppHeaderMenu | undefined;
  if (showCreateInHeader) {
    menu = {
      primaryActionItem: {
        id: 'createPipeline',
        label: createPipelineLabel,
        iconType: 'plusCircle',
        testId: 'createPipelineDropdown',
        items: [
          {
            id: 'createNewPipeline',
            label: newPipelineLabel,
            href: history.createHref({ pathname: createPath }),
            run: () => history.push(createPath),
            testId: 'createNewPipeline',
          },
          {
            id: 'createPipelineFromCsv',
            label: newPipelineFromCsvLabel,
            href: history.createHref({ pathname: createFromCsvPath }),
            run: () => history.push(createFromCsvPath),
            testId: 'createPipelineFromCsv',
          },
        ],
      },
    };

    if (services.config.enableManageProcessors && hasManageProcessorsPrivileges) {
      menu.items = [
        {
          id: 'manageProcessors',
          label: manageProcessorsLabel,
          iconType: 'wrench',
          testId: 'manageProcessorsLink',
          href: history.createHref({ pathname: manageProcessorsPath }),
          run: () => history.push(manageProcessorsPath),
        },
      ];
    }
  }

  let body: React.ReactNode;
  if (error) {
    body = (
      <EuiPageTemplate.EmptyPrompt
        color="danger"
        iconType="warning"
        title={
          <h2 data-test-subj="pipelineLoadError">
            <FormattedMessage
              id="xpack.ingestPipelines.list.loadErrorTitle"
              defaultMessage="Unable to load pipelines"
            />
          </h2>
        }
        body={<p>{getErrorText(error)}</p>}
        actions={
          <EuiButton onClick={resendRequest} iconType="refresh" color="danger">
            <FormattedMessage
              id="xpack.ingestPipelines.list.loadPipelineReloadButton"
              defaultMessage="Try again"
            />
          </EuiButton>
        }
      />
    );
  } else if (isLoading && !data) {
    body = (
      <SectionLoading data-test-subj="sectionLoading">
        <FormattedMessage
          id="xpack.ingestPipelines.list.loadingMessage"
          defaultMessage="Loading pipelines..."
        />
      </SectionLoading>
    );
  } else if (data && data.length === 0) {
    body = <EmptyList />;
  } else {
    body = (
      <>
        <PipelineTable
          isLoading={isLoading}
          onReloadClick={resendRequest}
          onEditPipelineClick={goToEditPipeline}
          onDeletePipelineClick={setPipelinesToDelete}
          onClonePipelineClick={goToClonePipeline}
          pipelines={data as Pipeline[]}
          openFlyout={(name) => {
            const params = new URLSearchParams(history.location.search);
            params.set('pipeline', name);
            history.push({
              pathname: '',
              search: params.toString(),
            });
            setShowFlyout(true);
          }}
        />

        {showFlyout && pipelineNameFromLocation && (
          <PipelineFlyout
            ingestPipeline={pipelineNameFromLocation}
            onClose={goHome}
            onCreateClick={goToCreatePipeline}
            onEditClick={goToEditPipeline}
            onCloneClick={goToClonePipeline}
            onDeleteClick={setPipelinesToDelete}
          />
        )}

        {pipelinesToDelete?.length > 0 ? (
          <PipelineDeleteModal
            callback={(deleteResponse) => {
              if (deleteResponse?.hasDeletedPipelines) {
                // reload pipelines list
                resendRequest();
                goHome();
              }
              setPipelinesToDelete([]);
            }}
            pipelinesToDelete={pipelinesToDelete}
          />
        ) : null}
      </>
    );
  }

  return (
    <>
      <AppHeader
        title={ingestPipelinesListTitle}
        description={listDescription}
        menu={menu}
        docLink={services.documentation.getIngestNodeUrl()}
        spacing="bleed"
      />

      <EuiSpacer size="l" />

      {body}
      {services.consolePlugin?.EmbeddableConsole ? (
        <services.consolePlugin.EmbeddableConsole />
      ) : null}
    </>
  );
};
