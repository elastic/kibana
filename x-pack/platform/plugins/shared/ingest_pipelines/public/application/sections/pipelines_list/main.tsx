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
import { useCheckManageProcessorsPrivileges } from '../manage_processors';

import { EmptyList } from './empty_list';
import { PipelineTable } from './table';
import { PipelineDeleteModal } from './delete_modal';
import { getErrorText } from '../utils';
import { PipelineFlyout } from './pipeline_flyout';

const getPipelineNameFromLocation = (location: Location) => {
  const params = new URLSearchParams(location.search);
  return params.get('pipeline');
};

export const PipelinesList: React.FunctionComponent<RouteComponentProps> = ({ history }) => {
  const { services } = useKibana();

  const pipelineNameFromLocation = getPipelineNameFromLocation(history.location);

  const [showFlyout, setShowFlyout] = useState<boolean>(pipelineNameFromLocation !== null);
  const [showPopover, setShowPopover] = useState<boolean>(false);

  const [pipelinesToDelete, setPipelinesToDelete] = useState<Pipeline[]>([]);

  const { data, isLoading, error, resendRequest } = services.api.useLoadPipelines();

  const hasManageProcessorsPrivileges = useCheckManageProcessorsPrivileges();
  // Track component loaded
  useEffect(() => {
    services.metric.trackUiMetric(UIM_PIPELINES_LIST_LOAD);
    services.breadcrumbs.setBreadcrumbs('home');
  }, [services.metric, services.breadcrumbs]);

  const goToEditPipeline = (pipelineName: string) => {
    // When we client-side react-router/history navigate to edit page
    // we double encode the pathname part like this: history.push('/<basename>/edit/' + encodeURIComponent(encodeURIComponent('<name>')))

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
    const encodedParam = encodeURIComponent(pipelineName);
    history.push(getEditPath({ pipelineName: encodedParam }));
  };

  const goToClonePipeline = (clonedPipelineName: string) => {
    // When we client-side react-router/history navigate to clone page from pipelines list,
    // we double encode the pathname part like this: history.push('/<basename>/create/' + encodeURIComponent(encodeURIComponent('<sourceName>')))

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
    const encodedParam = encodeURIComponent(clonedPipelineName);
    history.push(getClonePath({ clonedPipelineName: encodedParam }));
  };

  const goToCreatePipeline = (pipelineName: string) => {
    // We don't need to double encode here, only single encoding is enough
    // because we don't change pathname part only searchparams part which is not touched by history lib
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
      iconType="question"
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
      {services.consolePlugin?.EmbeddableConsole ? (
        <services.consolePlugin.EmbeddableConsole />
      ) : null}
    </>
  );
};
