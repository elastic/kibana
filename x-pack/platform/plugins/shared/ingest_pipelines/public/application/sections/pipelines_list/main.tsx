/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { RouteComponentProps } from 'react-router-dom';
import { FormattedMessage } from '@kbn/i18n-react';
import { Location } from 'history';
import { parse } from 'query-string';
import { i18n } from '@kbn/i18n';

import { reactRouterNavigate } from '@kbn/kibana-react-plugin/public';
import {
  EuiPageHeader,
  EuiButtonEmpty,
  EuiButton,
  EuiSpacer,
  EuiPageTemplate,
  EuiContextMenu,
  EuiPopover,
} from '@elastic/eui';

import { Pipeline } from '../../../../common/types';
import { useKibana, SectionLoading } from '../../../shared_imports';
import { UIM_PIPELINES_LIST_LOAD } from '../../constants';
import {
  getEditPath,
  getClonePath,
  getCreateFromCsvPath,
  getCreatePath,
  getManageProcessorsPath,
} from '../../services/navigation';
import { useCheckManageProcessorsPrivileges } from '../manage_processors';

import { EmptyList } from './empty_list';
import { PipelineTable } from './table';
import { PipelineDeleteModal } from './delete_modal';
import { getErrorText } from '../utils';
import { PipelineFlyout } from './pipeline_flyout';

const getPipelineNameFromLocation = (location: Location) => {
  const { pipeline } = parse(location.search.substring(1));
  return pipeline;
};

export const PipelinesList: React.FunctionComponent<RouteComponentProps> = ({
  history,
  location,
}) => {
  const { services } = useKibana();
  const pipelineNameFromLocation = getPipelineNameFromLocation(location);

  const [showFlyout, setShowFlyout] = useState<boolean>(false);
  const [showPopover, setShowPopover] = useState<boolean>(false);

  const [pipelinesToDelete, setPipelinesToDelete] = useState<Pipeline[]>([]);

  const { data, isLoading, error, resendRequest } = services.api.useLoadPipelines();

  const hasManageProcessorsPrivileges = useCheckManageProcessorsPrivileges();
  // Track component loaded
  useEffect(() => {
    services.metric.trackUiMetric(UIM_PIPELINES_LIST_LOAD);
    services.breadcrumbs.setBreadcrumbs('home');
  }, [services.metric, services.breadcrumbs]);

  useEffect(() => {
    if (pipelineNameFromLocation && data?.length) {
      setShowFlyout(true);
    }
  }, [pipelineNameFromLocation, data]);

  const goToEditPipeline = (pipelineName: string) => {
    const encodedParam = encodeURIComponent(pipelineName);
    history.push(getEditPath({ pipelineName: encodedParam }));
  };

  const goToClonePipeline = (clonedPipelineName: string) => {
    const encodedParam = encodeURIComponent(clonedPipelineName);
    history.push(getClonePath({ clonedPipelineName: encodedParam }));
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

  if (error) {
    return (
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
  }

  if (isLoading && !data) {
    return (
      <SectionLoading data-test-subj="sectionLoading">
        <FormattedMessage
          id="xpack.ingestPipelines.list.loadingMessage"
          defaultMessage="Loading pipelines..."
        />
      </SectionLoading>
    );
  }

  if (data && data.length === 0) {
    return <EmptyList />;
  }

  const createMenuItems = [
    /**
     * Create pipeline
     */
    {
      name: i18n.translate('xpack.ingestPipelines.list.table.createPipelineButtonLabel', {
        defaultMessage: 'New pipeline',
      }),
      ...reactRouterNavigate(history, getCreatePath()),
      'data-test-subj': `createNewPipeline`,
    },
    /**
     * Create pipeline from CSV
     */
    {
      name: i18n.translate('xpack.ingestPipelines.list.table.createPipelineFromCsvButtonLabel', {
        defaultMessage: 'New pipeline from CSV',
      }),
      ...reactRouterNavigate(history, getCreateFromCsvPath()),
      'data-test-subj': `createPipelineFromCsv`,
    },
  ];
  const titleActionButtons = [
    <EuiPopover
      key="createPipelinePopover"
      isOpen={showPopover}
      closePopover={() => setShowPopover(false)}
      button={
        <EuiButton
          fill
          iconSide="right"
          iconType="arrowDown"
          data-test-subj="createPipelineDropdown"
          key="createPipelineDropdown"
          onClick={() => setShowPopover((previousBool) => !previousBool)}
        >
          {i18n.translate('xpack.ingestPipelines.list.table.createPipelineDropdownLabel', {
            defaultMessage: 'Create pipeline',
          })}
        </EuiButton>
      }
      panelPaddingSize="none"
      repositionOnScroll
    >
      <EuiContextMenu
        initialPanelId={0}
        data-test-subj="autoFollowPatternActionContextMenu"
        panels={[
          {
            id: 0,
            items: createMenuItems,
          },
        ]}
      />
    </EuiPopover>,
  ];
  if (services.config.enableManageProcessors && hasManageProcessorsPrivileges) {
    titleActionButtons.push(
      <EuiButtonEmpty
        iconType="wrench"
        data-test-subj="manageProcessorsLink"
        {...reactRouterNavigate(history, getManageProcessorsPath())}
      >
        <FormattedMessage
          id="xpack.ingestPipelines.list.manageProcessorsLinkText"
          defaultMessage="Manage processors"
        />
      </EuiButtonEmpty>
    );
  }
  titleActionButtons.push(
    <EuiButtonEmpty
      href={services.documentation.getIngestNodeUrl()}
      target="_blank"
      iconType="help"
      data-test-subj="documentationLink"
    >
      <FormattedMessage
        id="xpack.ingestPipelines.list.pipelinesDocsLinkText"
        defaultMessage="Documentation"
      />
    </EuiButtonEmpty>
  );

  return (
    <>
      <EuiPageHeader
        bottomBorder
        pageTitle={
          <span data-test-subj="appTitle">
            <FormattedMessage
              id="xpack.ingestPipelines.list.listTitle"
              defaultMessage="Ingest Pipelines"
            />
          </span>
        }
        description={
          <FormattedMessage
            id="xpack.ingestPipelines.list.pipelinesDescription"
            defaultMessage="Use ingest pipelines to remove or transform fields, extract values from text, and enrich your data before indexing into Elasticsearch."
          />
        }
        rightSideItems={titleActionButtons}
      />

      <EuiSpacer size="l" />

      <PipelineTable
        isLoading={isLoading}
        onReloadClick={resendRequest}
        onEditPipelineClick={goToEditPipeline}
        onDeletePipelineClick={setPipelinesToDelete}
        onClonePipelineClick={goToClonePipeline}
        pipelines={data as Pipeline[]}
      />

      {showFlyout && (
        <PipelineFlyout
          pipeline={pipelineNameFromLocation}
          onClose={() => {
            goHome();
          }}
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
      {services.consolePlugin?.EmbeddableConsole ? (
        <services.consolePlugin.EmbeddableConsole />
      ) : null}
    </>
  );
};
